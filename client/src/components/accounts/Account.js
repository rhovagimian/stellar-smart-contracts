import React, { Component } from "react";
import { connect } from "react-redux";
import * as actions from "../../actions";

class Account extends Component {
  componentWillMount() {
    //stream balance
    this.props.getBalance(this.props.account.key);
  }

  getBalances() {
    if (!this.props.account.balances) {
      return <div />;
    }
    const balances = this.props.account.balances.map((balance, index) => {
      return (
        <p key={index} className="card-text">
          Balance: {balance.balance} {balance.asset_type}
        </p>
      );
    });
    return balances;
  }

  render() {
    /*<p class="card-text">...</p>
    <a href="#" class="card-link">Card link</a>
    <a href="#" class="card-link">Another link</a>*/
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">{this.props.title} Account</h5>
          <h6 className="card-subtitle mb-2 text-muted">
            {this.props.account.key}
          </h6>
          {this.getBalances()}
        </div>
      </div>
    );
  }
}

export default connect(null, actions)(Account);
