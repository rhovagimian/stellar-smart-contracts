import {
  CREATE_SOURCE,
  CREATE_DESTINATION,
  CREATE_ESCROW,
  GET_BALANCE
} from "./types";
import axios from "axios";
import StellarSdk from "stellar-sdk";
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
StellarSdk.Network.useTestNetwork();

export const createSource = () => async dispatch => {
  const res = await axios.get("/stellar/create_account");

  dispatch({ type: CREATE_SOURCE, payload: res.data });
};

export const createDestination = () => async dispatch => {
  const res = await axios.get("/stellar/create_account");

  dispatch({ type: CREATE_DESTINATION, payload: res.data });
};

export const createEscrow = account => async dispatch => {
  const res = await axios.post("/stellar/create_escrow", account);

  dispatch({ type: CREATE_ESCROW, payload: res.data });
};

export const getBalance = publicKey => dispatch => {
  server
    .accounts()
    .accountId(publicKey)
    .cursor("now")
    .stream({
      onmessage: ({ account_id, balances }) => {
        //console.log(message);
        dispatch({
          type: GET_BALANCE,
          payload: { key: account_id, balances }
        });
      }
    });
};
