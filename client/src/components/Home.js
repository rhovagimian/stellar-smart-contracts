import React, { Component } from "react";
import Account from "./accounts/Account";
import SourceAccount from "./accounts/SourceAccount";
import { connect } from "react-redux";
import * as actions from "../actions";

class Home extends Component {
  componentWillMount() {
    this.props.createAccounts();
  }

  getSourceAccount() {
    if (this.props.source) {
      return <SourceAccount account={this.props.source} />;
    }
    return <div />;
  }

  getAccount(title, key) {
    if (this.props[key]) {
      return <Account title={title} account={this.props[key]} />;
    }
    return <div />;
  }

  render() {
    return (
      <div>
        <div className="row">
          <div className="col col-1" />
          <div className="col col-4">{this.getSourceAccount()}</div>
          <div className="col col-2" />
          <div className="col col-4">
            {this.getAccount("Destination", "destination")}
          </div>
          <div className="col col-1" />
        </div>
        <div className="row">
          <div className="col col-12">&nbsp;</div>
        </div>
        <div className="row">
          <div className="col col-4" />
          <div className="col col-4">{this.getAccount("Escrow", "escrow")}</div>
          <div className="col col-4" />
        </div>
      </div>
    );
  }
}

function mapStateToProps({ accounts }) {
  return {
    source: accounts.source,
    destination: accounts.destination,
    escrow: accounts.escrow
  };
}

export default connect(mapStateToProps, actions)(Home);
