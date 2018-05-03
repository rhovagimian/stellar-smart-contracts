import React, { Component } from "react";
import { Button, Card, Icon } from "semantic-ui-react";
import { connect } from "react-redux";
import * as actions from "../actions";

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
      return <p key={index}>Balance: {balance.balance} XLM</p>;
    });
    return balances;
  }

  handleClick() {
    this.props.signTransaction(this.props.account);
  }

  renderButtons() {
    if (!this.props.showButtons) return <div />;
    return (
      <Card.Content extra>
        <div className="ui two buttons">
          <Button
            toggle
            active={this.props.account.signed}
            //color="green"
            onClick={this.handleClick.bind(this)}
          >
            Sign
          </Button>
        </div>
      </Card.Content>
    );
  }

  render() {
    return (
      <Card style={{ width: "100%", margin: "auto" }}>
        <Card.Content>
          <Icon name="home" size="large" style={{ float: "right" }} />
          <Card.Header>{this.props.title} Account</Card.Header>
          <Card.Meta style={{ wordWrap: "break-word" }}>
            {this.props.account.key}
          </Card.Meta>
          <Card.Description>{this.getBalances()}</Card.Description>
        </Card.Content>
        {this.renderButtons()}
      </Card>
    );
  }
}

export default connect(null, actions)(Account);
