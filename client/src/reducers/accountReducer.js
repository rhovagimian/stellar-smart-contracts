import _ from "lodash";
import { GET_BALANCE, SIGN_TRANSACTION } from "../actions/types";

export default function(name) {
  return function(state = {}, action) {
    switch (action.type) {
      case `create_${name}`:
        return action.payload;
      case GET_BALANCE:
        if (
          state.key === action.payload.key &&
          !_.isEqual(state.balances, action.payload.balances)
        ) {
          return { ...state, balances: action.payload.balances };
        }
        return state;
      case SIGN_TRANSACTION:
        if (state.key === action.payload.key) {
          return {
            ...state,
            signed: action.payload.signed,
            envelope: action.payload.envelope,
            remainingTime: action.payload.remainingTime
          };
        }
        return state;
      default:
        return state;
    }
  };
}
