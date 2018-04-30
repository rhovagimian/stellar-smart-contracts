import { combineReducers } from "redux";
import accountsReducer from "./accountsReducer";

export default combineReducers({
  accounts: accountsReducer
});
