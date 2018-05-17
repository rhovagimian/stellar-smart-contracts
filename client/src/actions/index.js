import {
  CREATE_SOURCE,
  CREATE_DESTINATION,
  CREATE_ESCROW,
  SIGN_TRANSACTION,
  GET_BALANCE,
  SUBMIT_TRANSACTION
} from "./types";
import axios from "axios";
import _ from "lodash";
import StellarSdk from "stellar-sdk";
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
StellarSdk.Network.useTestNetwork();

export const createAccounts = () => async dispatch => {
  const source = await axios.post("/stellar/create_account", {
    type: "source"
  });
  dispatch({ type: CREATE_SOURCE, payload: source.data });

  const destination = await axios.post("/stellar/create_account", {
    type: "destination"
  });
  dispatch({ type: CREATE_DESTINATION, payload: destination.data });

  const escrow = await axios.post("/stellar/create_escrow", {
    source: source.data.key,
    destination: destination.data.key
  });
  dispatch({ type: CREATE_ESCROW, payload: escrow.data });
};

export const signTransaction = key => async dispatch => {
  const response = await axios.post("/stellar/sign_transaction", { key });
  _.mapKeys(response.data, account => {
    dispatch({ type: SIGN_TRANSACTION, payload: account });
  });
};

export const submitTransaction = envelope => async dispatch => {
  const response = await axios
    .post("/stellar/submit_transaction", {
      envelope
    })
    .catch(err => {
      console.log(err);
    });
  //rejected promises return undefined
  if (response) {
    dispatch({
      type: SUBMIT_TRANSACTION,
      payload: response.data
    });
  }
};

export const getBalance = publicKey => dispatch => {
  const tDispatch = _.throttle(dispatch, 500);
  server
    .accounts()
    .accountId(publicKey)
    .cursor("now")
    .stream({
      onmessage: ({ account_id, balances }) => {
        tDispatch({
          type: GET_BALANCE,
          payload: { key: account_id, balances }
        });
      }
    });
};
