import _ from "lodash";
import {
  CREATE_SOURCE,
  CREATE_DESTINATION,
  CREATE_ESCROW,
  GET_BALANCE,
  SIGN_TRANSACTION
} from "../actions/types";

export default function(state = {}, action) {
  switch (action.type) {
    case CREATE_SOURCE:
    case CREATE_DESTINATION:
    case CREATE_ESCROW:
    case SIGN_TRANSACTION:
      return action.payload;
    case GET_BALANCE:
      const accountType = _.filter(Object.keys(state), accountType => {
        return state[accountType].key === action.payload.key;
      });
      if (accountType) {
        const newState = { ...state };
        newState[accountType] = { ...newState[accountType], ...action.payload };
        return newState;
      }
      return state;
    default:
      return state;
  }
}
