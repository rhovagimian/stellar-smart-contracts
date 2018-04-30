import _ from "lodash";
import {
  CREATE_SOURCE,
  CREATE_DESTINATION,
  CREATE_ESCROW,
  GET_BALANCE
} from "../actions/types";

export default function(state = {}, action) {
  switch (action.type) {
    case CREATE_SOURCE:
      return { ...state, source: action.payload };
    case CREATE_DESTINATION:
      return { ...state, destination: action.payload };
    case CREATE_ESCROW:
      return { ...state, escrow: action.payload };
    case GET_BALANCE:
      const accountType = _.filter(Object.keys(state), accountType => {
        return state[accountType].key === action.payload.key;
      });
      if (accountType) {
        const newState = { ...state };
        newState[accountType] = action.payload;
        return newState;
      }
      return state;
    default:
      return state;
  }
}
