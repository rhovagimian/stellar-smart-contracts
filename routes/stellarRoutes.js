const _ = require("lodash");
const request = require("request-promise-native");
var StellarSdk = require("stellar-sdk");
var server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
StellarSdk.Network.useTestNetwork();

module.exports = app => {
  const UNLOCK_MINUTES = 0.25;
  app.post("/stellar/create_account", async (req, res) => {
    const accountType = req.body.type;
    const keyPair = StellarSdk.Keypair.random();
    if (accountType === "source") {
      req.session.keyLookup = {};
      req.session.accounts = {};
    }
    req.session.keyLookup[keyPair.publicKey()] = keyPair.secret();
    req.session.accounts[accountType] = {
      key: keyPair.publicKey()
    };

    console.log("Account secret", keyPair.secret());

    const receipt = await request
      .get({
        url: "https://friendbot.stellar.org",
        qs: {
          addr: keyPair.publicKey()
        },
        json: true
      })
      .catch(err => {
        console.error("ERROR!", err);
        res.status(422).send(err);
      });

    res.send({ key: keyPair.publicKey() });
  });

  app.post("/stellar/create_escrow", async (req, res) => {
    //load the source account
    const accounts = req.body;

    const srcSecret = req.session.keyLookup[accounts.source];
    const src = StellarSdk.Keypair.fromSecret(srcSecret);
    const srcAccount = await server.loadAccount(src.publicKey());

    console.log("-----------------------------------------------------");
    console.log("------------------Create Escrow----------------------");
    console.log("-----------------------------------------------------");

    //create escrow account by first person
    const escrow = StellarSdk.Keypair.random();
    const transaction1 = new StellarSdk.TransactionBuilder(srcAccount)
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: escrow.publicKey(),
          startingBalance: "2" // in XLM
        })
      )
      .build();
    transaction1.sign(StellarSdk.Keypair.fromSecret(src.secret()));
    await server.submitTransaction(transaction1).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });

    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 2---------------------");
    console.log("-----------------------------------------------------");
    const destSecret = req.session.keyLookup[accounts.destination];
    const dest = StellarSdk.Keypair.fromSecret(destSecret);
    let escrowAccount = await server.loadAccount(escrow.publicKey());
    const transaction2 = new StellarSdk.TransactionBuilder(escrowAccount)
      .addOperation(
        StellarSdk.Operation.setOptions({
          signer: {
            ed25519PublicKey: dest.publicKey(),
            weight: 1
          }
        })
      )
      .addOperation(
        StellarSdk.Operation.setOptions({
          masterWeight: 1,
          lowThreshold: 2,
          medThreshold: 2,
          highThreshold: 2
        })
      )
      .build();
    transaction2.sign(StellarSdk.Keypair.fromSecret(escrow.secret()));
    await server.submitTransaction(transaction2).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });

    //store keylookup and accounts
    req.session.keyLookup[escrow.publicKey()] = escrow.secret();
    req.session.accounts.escrow = { key: escrow.publicKey() };
    res.send({ key: escrow.publicKey() });
  });

  app.post("/stellar/sign_transaction", async (req, res) => {
    const accounts = req.session.accounts;
    const publicKey = req.body.key;

    const accountType = _.filter(Object.keys(accounts), accountType => {
      return accounts[accountType].key === publicKey;
    });
    //save account type
    if (accountType) {
      accounts[accountType].signed = !accounts[accountType].signed;
    }

    if (accounts.source.signed && accounts.destination.signed) {
      const destSecret = req.session.keyLookup[accounts.destination.key];
      const dest = StellarSdk.Keypair.fromSecret(destSecret);

      console.log("-----------------------------------------------------");
      console.log("------------------Transacation 3---------------------");
      console.log("-----------------------------------------------------");

      const unlockDate = new Date(
        new Date().getTime() + UNLOCK_MINUTES * 60000
      );
      console.log(`Unlock date in ${UNLOCK_MINUTES} minutes:`, unlockDate);
      const unixUnlock = Math.round(unlockDate.getTime() / 1000);
      console.log("Unix unlock date", unixUnlock);
      const escrowSecret = req.session.keyLookup[accounts.escrow.key];
      const escrow = StellarSdk.Keypair.fromSecret(escrowSecret);
      const escrowAccount = await server.loadAccount(escrow.publicKey());

      const sequenceNumber = escrowAccount.sequenceNumber();
      console.log("sequenceNumber", sequenceNumber);

      const transaction3 = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account(escrow.publicKey(), sequenceNumber),
        {
          timebounds: {
            minTime: unixUnlock,
            maxTime: 0
          }
        }
      )
        .addOperation(
          StellarSdk.Operation.setOptions({
            masterWeight: 0,
            lowThreshold: 1,
            medThreshold: 1,
            highThreshold: 1
          })
        )
        .build();
      transaction3.sign(StellarSdk.Keypair.fromSecret(escrow.secret()));
      transaction3.sign(StellarSdk.Keypair.fromSecret(dest.secret()));
      accounts.destination.envelope = transaction3.toEnvelope().toXDR("base64");
      accounts.destination.remainingTime =
        (unlockDate - new Date().getTime()) / 1000;

      console.log("-----------------------------------------------------");
      console.log("------------------Transacation 4---------------------");
      console.log("-----------------------------------------------------");
      const recoveryDate = new Date(
        unlockDate.getTime() + UNLOCK_MINUTES * 60000
      );
      const unixRecovery = Math.round(recoveryDate.getTime() / 1000);
      console.log("Unix recovery time", unixRecovery);
      const transaction4 = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account(escrow.publicKey(), sequenceNumber),
        {
          timebounds: {
            minTime: unixRecovery,
            maxTime: 0
          }
        }
      )
        .addOperation(
          StellarSdk.Operation.setOptions({
            signer: {
              ed25519PublicKey: dest.publicKey(),
              weight: 0
            },
            lowThreshold: 1,
            medThreshold: 1,
            highThreshold: 1
          })
        )
        .build();
      transaction4.sign(StellarSdk.Keypair.fromSecret(escrow.secret()));
      transaction4.sign(StellarSdk.Keypair.fromSecret(dest.secret()));
      accounts.source.envelope = transaction4.toEnvelope().toXDR("base64");
      accounts.source.remainingTime =
        (recoveryDate - new Date().getTime()) / 1000;
      console.log(transaction4.sequence);

      //can't submit this transaction for at least 5 minutes
      //both the source & destination need to sign this transaction, each hold a copy,
      //either can submit it at any point after the unlock period

      console.log("-----------------------------------------------------");
      console.log("------------------Transacation 5---------------------");
      console.log("-----------------------------------------------------");
      const srcSecret = req.session.keyLookup[accounts.source.key];
      const src = StellarSdk.Keypair.fromSecret(srcSecret);
      const srcAccount = await server.loadAccount(src.publicKey());
      const transaction5 = new StellarSdk.TransactionBuilder(srcAccount)
        .addOperation(
          StellarSdk.Operation.payment({
            destination: escrow.publicKey(),
            asset: StellarSdk.Asset.native(),
            amount: "100" // in XLM
          })
        )
        .build();
      transaction5.sign(StellarSdk.Keypair.fromSecret(src.secret()));
      const receipt5 = await server
        .submitTransaction(transaction5)
        .catch(err => {
          console.error("ERROR!", err);
          res.status(422).send(err);
        });
      console.log(receipt5);
      console.log("-----------------------------------------------------");
    }
    console.log(accounts);
    req.session.accounts = accounts;
    res.send(accounts);
  });

  app.post("/stellar/submit_transaction", async (req, res) => {
    const envelope = req.body.envelope;
    const withdrawPublicKey = _.filter(req.session.accounts, { envelope })[0]
      .key;

    const withdrawSecret = req.session.keyLookup[withdrawPublicKey];
    const transaction = new StellarSdk.Transaction(envelope);
    console.log("-----------------------------------------------------");
    console.log("----------------Submit Transacation------------------");
    console.log("-----------------------------------------------------");
    const receipt = await server.submitTransaction(transaction).catch(err => {
      console.error("ERROR!", err.data.extras.results_codes);
      res.status(422).send(err.data);
    });
    if (!receipt || !withdrawSecret) {
      return;
    }
    //withdraw all the money from escrow to account
    const withdrawal = StellarSdk.Keypair.fromSecret(withdrawSecret);
    //get escrow account
    const escrowSecret = req.session.keyLookup[req.session.accounts.escrow.key];
    const escrow = StellarSdk.Keypair.fromSecret(escrowSecret);
    const escrowAccount = await server.loadAccount(escrow.publicKey());

    console.log("Distribute to Account", withdrawal.publicKey());
    const withdrawTransaction = new StellarSdk.TransactionBuilder(escrowAccount)
      // add a payment operation to the transaction
      .addOperation(
        StellarSdk.Operation.payment({
          destination: withdrawal.publicKey(),
          asset: StellarSdk.Asset.native(),
          amount: "100.50" // 100.50 XLM
        })
      )
      .build();
    if (withdrawPublicKey === req.session.accounts.source.key) {
      withdrawTransaction.sign(escrow);
    } else {
      withdrawTransaction.sign(withdrawal);
    }
    console.log(withdrawTransaction);
    const withdrawReceipt = await server
      .submitTransaction(withdrawTransaction)
      .catch(err => {
        console.error("ERROR!", err.data.extras.results_codes);
        res.status(422).send(err);
      });
    res.send(withdrawReceipt);
  });
};

/*app.get("/stellar/end-to-end", async (req, res) => {
    const src = StellarSdk.Keypair.random();
    console.log("source secret", src.secret());

    const srcReceipt = await request
      .get({
        url: "https://friendbot.stellar.org",
        qs: {
          addr: src.publicKey()
        },
        json: true
      })
      .catch(err => {
        console.error("ERROR!", err);
        res.status(422).send(err);
      });

    //console.log("SUCCESS! You have a new account :)\n", srcReceipt);
    let srcAccount = await server.loadAccount(src.publicKey());
    console.log("Balances for source account");
    srcAccount.balances.forEach(balance => {
      console.log(`Type: ${balance.asset_type}; Balance: ${balance.balance}`);
    });

    console.log("-----------------------------------------------------");
    //create second person
    const dest = StellarSdk.Keypair.random();
    console.log("destination secret", dest.secret());
    const destReceipt = await request
      .get({
        url: "https://friendbot.stellar.org",
        qs: {
          addr: dest.publicKey()
        },
        json: true
      })
      .catch(err => {
        console.error("ERROR!", err);
        res.status(422).send(err);
      });

    //create second account
    const destAccount = await server.loadAccount(dest.publicKey());
    console.log("Balances for destination account");
    destAccount.balances.forEach(function(balance) {
      console.log(`Type: ${balance.asset_type}; Balance: ${balance.balance}`);
    });

    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 1---------------------");
    console.log("-----------------------------------------------------");

    //create escrow account by first person
    const escrow = StellarSdk.Keypair.random();
    const transaction1 = new StellarSdk.TransactionBuilder(srcAccount)
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: escrow.publicKey(),
          startingBalance: "5" // in XLM
        })
      )
      .build();
    transaction1.sign(StellarSdk.Keypair.fromSecret(src.secret()));
    const receipt1 = await server.submitTransaction(transaction1).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });
    console.log(receipt1);
    console.log("-----------------------------------------------------");

    console.log("Balances for source account");
    srcAccount = await server.loadAccount(src.publicKey());
    srcAccount.balances.forEach(balance => {
      console.log(`Type: ${balance.asset_type}; Balance: ${balance.balance}`);
    });

    console.log("Balances for escrow account");
    let escrowAccount = await server.loadAccount(escrow.publicKey());
    escrowAccount.balances.forEach(balance => {
      console.log(`Type: ${balance.asset_type}; Balance: ${balance.balance}`);
    });

    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 2---------------------");
    console.log("-----------------------------------------------------");
    const transaction2 = new StellarSdk.TransactionBuilder(escrowAccount)
      .addOperation(
        StellarSdk.Operation.setOptions({
          signer: {
            ed25519PublicKey: dest.publicKey(),
            weight: 1
          }
        })
    ).addOperation(
      StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: source.publicKey(),
          weight: 1
        }
      })
    )
      .addOperation(
        StellarSdk.Operation.setOptions({
          masterWeight: 0,
          lowThreshold: 2,
          medThreshold: 2,
          highThreshold: 2
        })
      )
      .build();
    transaction2.sign(StellarSdk.Keypair.fromSecret(escrow.secret()));
    const receipt2 = await server.submitTransaction(transaction2).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });
    console.log(receipt2);
    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 3---------------------");
    console.log("-----------------------------------------------------");

    const unlockDate = new Date(new Date().getTime() + UNLOCK_MINUTES * 60000);
    console.log(`Unlock date in ${UNLOCK_MINUTES} minutes:`, unlockDate);
    const unixUnlock = Math.round(unlockDate.getTime() / 1000);
    console.log("Unix unlock date", unixUnlock);
    const sequenceNumber = escrowAccount.sequenceNumber();

    const transaction3 = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(escrow.publicKey(), sequenceNumber),
      {
        timebounds: {
          minTime: unixUnlock,
          maxTime: 0
        }
      }
    )
      .addOperation(
        StellarSdk.Operation.setOptions({
          masterWeight: 0,
          lowThreshold: 1,
          medThreshold: 1,
          highThreshold: 1
        })
      )
      .build();
    transaction3.sign(StellarSdk.Keypair.fromSecret(escrow.secret()));
    transaction3.sign(StellarSdk.Keypair.fromSecret(dest.secret()));
    console.log(transaction3.sequence);

    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 4---------------------");
    console.log("-----------------------------------------------------");
    const recoveryDate = new Date(
      unlockDate.getTime() + UNLOCK_MINUTES * 60000
    );
    console.log("Recovery Time", recoveryDate);
    const unixRecovery = Math.round(recoveryDate.getTime() / 1000);
    console.log("Unix recovery time", unixRecovery);

    const transaction4 = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(escrow.publicKey(), sequenceNumber),
      {
        timebounds: {
          minTime: unixRecovery,
          maxTime: 0
        }
      }
    )
      .addOperation(
        StellarSdk.Operation.setOptions({
          signer: {
            ed25519PublicKey: dest.publicKey(),
            weight: 0
          },
          masterWeight: 0,
          lowThreshold: 1,
          medThreshold: 1,
          highThreshold: 1
        })
      )
      .build();
    transaction4.sign(StellarSdk.Keypair.fromSecret(escrow.secret()));
    transaction4.sign(StellarSdk.Keypair.fromSecret(dest.secret()));
    console.log(transaction4.sequence);

    //can't submit this transaction for at least 5 minutes
    //both the source & destination need to sign this transaction, each hold a copy,
    //either can submit it at any point after the unlock period

    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 5---------------------");
    console.log("-----------------------------------------------------");

    const transaction5 = new StellarSdk.TransactionBuilder(srcAccount)
      .addOperation(
        StellarSdk.Operation.payment({
          destination: escrow.publicKey(),
          asset: StellarSdk.Asset.native(),
          amount: "100" // in XLM
        })
      )
      .build();
    transaction5.sign(StellarSdk.Keypair.fromSecret(src.secret()));
    const receipt5 = await server.submitTransaction(transaction5).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });
    console.log(receipt5);
    console.log("-----------------------------------------------------");

    console.log("Balances for source account");
    srcAccount = await server.loadAccount(src.publicKey());
    srcAccount.balances.forEach(balance => {
      console.log(`Type: ${balance.asset_type}; Balance: ${balance.balance}`);
    });

    escrowAccount = await server.loadAccount(escrow.publicKey());
    console.log("Balances for escrow account");
    escrowAccount.balances.forEach(balance => {
      console.log(`Type: ${balance.asset_type}; Balance: ${balance.balance}`);
    });

    res.send("Check the logs!");
  }); */
