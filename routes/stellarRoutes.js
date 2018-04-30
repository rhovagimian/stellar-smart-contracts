const _ = require("lodash");
const request = require("request-promise-native");
var StellarSdk = require("stellar-sdk");
var server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
StellarSdk.Network.useTestNetwork();

module.exports = app => {
  app.get("/stellar/create_account", async (req, res) => {
    const keyPair = StellarSdk.Keypair.random();
    if (!req.session.keyLookup) {
      req.session.keyLookup = {};
    }
    req.session.keyLookup[keyPair.publicKey()] = keyPair.secret();

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
    const srcSecret = req.session.keyLookup[req.body.key];
    const src = StellarSdk.Keypair.fromSecret(srcSecret);
    const srcAccount = await server.loadAccount(src.publicKey());

    console.log("-----------------------------------------------------");
    console.log("------------------Create Escrow----------------------");
    console.log("-----------------------------------------------------");

    //create escrow account by first person
    const escrow = StellarSdk.Keypair.random();
    const transaction = new StellarSdk.TransactionBuilder(srcAccount)
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: escrow.publicKey(),
          startingBalance: "5" // in XLM
        })
      )
      .build();
    transaction.sign(StellarSdk.Keypair.fromSecret(src.secret()));
    const receipt = await server.submitTransaction(transaction).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });
    console.log(receipt);
    res.send({ key: escrow.publicKey() });
  });

  app.get("/stellar/end-to-end", async (req, res) => {
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
    const receipt2 = await server.submitTransaction(transaction2).catch(err => {
      console.error("ERROR!", err);
      res.status(422).send(err);
    });
    console.log(receipt2);
    console.log("-----------------------------------------------------");
    console.log("------------------Transacation 3---------------------");
    console.log("-----------------------------------------------------");

    const unlockDate = new Date(new Date().getTime() + 5 * 60000);
    console.log("Unlock date in 5 minutes:", unlockDate);
    const sequenceNumber = escrowAccount.sequenceNumber();
    console.log("sequenceNumber", sequenceNumber);

    const transaction3 = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(escrow.publicKey(), sequenceNumber),
      {
        timebounds: {
          minTime: unlockDate.getTime(),
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
    const recoveryDate = new Date(unlockDate.getTime() + 5 * 60000);
    const transaction4 = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account(escrow.publicKey(), sequenceNumber),
      {
        timebounds: {
          minTime: recoveryDate.getTime(),
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
  });
};
