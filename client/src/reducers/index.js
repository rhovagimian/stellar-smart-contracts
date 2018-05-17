import { combineReducers } from "redux";
//import accountsReducer from "./accountsReducer";
import accountReducer from "./accountReducer";

export default combineReducers({
  source: accountReducer("source"),
  destination: accountReducer("destination"),
  escrow: accountReducer("escrow")
});
