import {
  CREATE_SOURCE,
  CREATE_DESTINATION,
  CREATE_ESCROW,
  SIGN_TRANSACTION,
  GET_BALANCE
} from "./types";
import axios from "axios";
import StellarSdk from "stellar-sdk";
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
StellarSdk.Network.useTestNetwork();

export const createAccounts = () => async dispatch => {
  const respSource = await axios.post("/stellar/create_account", {
    type: "source"
  });
  dispatch({ type: CREATE_SOURCE, payload: respSource.data });

  const respAccounts = await axios.post("/stellar/create_account", {
    type: "destination"
  });
  dispatch({ type: CREATE_DESTINATION, payload: respAccounts.data });

  const escrow = await axios.post("/stellar/create_escrow", respAccounts.data);
  dispatch({ type: CREATE_ESCROW, payload: escrow.data });
};

export const signTransaction = account => async dispatch => {
  account.signed = !account.signed;
  const accounts = await axios.post("/stellar/sign_transaction", account);
  dispatch({ type: SIGN_TRANSACTION, payload: accounts.data });
};

export const getBalance = publicKey => dispatch => {
  server
    .accounts()
    .accountId(publicKey)
    .cursor("now")
    .stream({
      onmessage: ({ account_id, balances }) => {
        dispatch({
          type: GET_BALANCE,
          payload: { key: account_id, balances }
        });
      }
    });
};
