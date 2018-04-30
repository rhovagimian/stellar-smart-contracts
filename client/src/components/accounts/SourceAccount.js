import React, { Component } from "react";
import { connect } from "react-redux";
import Account from "./Account";
import * as actions from "../../actions";

class SourceAccount extends Component {
  componentWillMount() {
    this.props.createEscrow(this.props.account);
  }

  render() {
    if (!this.props.account) {
      return <div />;
    }
    return <Account title="Source" account={this.props.account} />;
  }
}

export default connect(null, actions)(SourceAccount);
