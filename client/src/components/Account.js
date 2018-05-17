import React, { Component } from "react";
import { Button, Card, Icon } from "semantic-ui-react";
import ReactCountdownClock from "react-countdown-clock";
import { connect } from "react-redux";
import * as actions from "../actions";

class Account extends Component {
  componentWillMount() {
    //stream balance
    this.props.getBalance(this.props.publicKey);
  }

  getBalances() {
    if (!this.props.balances) {
      return <div />;
    }
    const balances = this.props.balances.map((balance, index) => {
      return <p key={index}>Balance: {balance.balance} XLM</p>;
    });
    return <div style={{ float: "left" }}>{balances}</div>;
  }

  handleSign() {
    this.props.signTransaction(this.props.publicKey);
  }

  handleUnlock() {
    if (this.props.envelope) {
      this.props.submitTransaction(this.props.envelope);
    }
  }

  renderButtons() {
    if (!this.props.showButtons) return <div />;
    let button;
    if (this.props.envelope) {
      button = (
        <Button color="green" onClick={this.handleUnlock.bind(this)}>
          Withdrawal
        </Button>
      );
    } else {
      button = (
        <Button
          toggle
          active={this.props.signed}
          onClick={this.handleSign.bind(this)}
        >
          Sign
        </Button>
      );
    }
    return (
      <Card.Content extra>
        <div className="ui two buttons">{button}</div>
      </Card.Content>
    );
  }
  getCountdown() {
    if (this.props.remainingTime) {
      return (
        <div style={{ float: "right", marginTop: "-25px" }}>
          <ReactCountdownClock
            seconds={this.props.remainingTime}
            color="#db2828"
            alpha={0.9}
            size={50}
          />
        </div>
      );
    }
    return <div />;
  }

  render() {
    return (
      <Card style={{ width: "100%", margin: "auto" }}>
        <Card.Content>
          <Icon
            name={this.props.icon}
            size="large"
            style={{ float: "right" }}
          />
          <Card.Header>{this.props.title} Account</Card.Header>
          <Card.Meta style={{ wordWrap: "break-word" }}>
            {this.props.publicKey}
          </Card.Meta>
          <Card.Description>
            {this.getBalances()}
            {this.getCountdown()}
          </Card.Description>
        </Card.Content>
        {this.renderButtons()}
      </Card>
    );
  }
}

export default connect(null, actions)(Account);
