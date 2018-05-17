import React, { Component } from "react";
import { Grid, Divider, Header } from "semantic-ui-react";
import Account from "./Account";
import { connect } from "react-redux";
import * as actions from "../actions";

class Home extends Component {
  componentWillMount() {
    this.props.createAccounts();
  }

  getAccount(title, type, icon) {
    if (this.props[type] && this.props[type].key) {
      const { key, envelope, balances, signed, remainingTime } = this.props[
        type
      ];

      return (
        <Account
          title={title}
          icon={icon}
          publicKey={key}
          envelope={envelope}
          balances={balances}
          signed={signed}
          remainingTime={remainingTime}
          showButtons={this.props.escrow && type !== "escrow"}
        />
      );
    }
    return <div />;
  }

  render() {
    return (
      <Grid>
        <Grid.Row centered>
          <Grid.Column width="14" style={{ marginTop: "1em" }}>
            <Header as="h1">Use Case Scenario</Header>
            <Divider />
            <p>
              Ben Bitdiddle (Source) sells 100 XLM tokens to Alyssa P. Hacker
              (Destination), under the condition that Alyssa won’t resell the
              tokens until one year has passed. Ben doesn’t completely trust
              Alyssa so he suggests that he holds the tokens for Alyssa for the
              year.
            </p>
            <p>
              Alyssa protests. How will she know that Ben will still have the
              tokens after one year? How can she trust him to eventually deliver
              them?
            </p>
            <p>
              Additionally, Alyssa is sometimes forgetful. There’s a chance she
              won’t remember to claim her tokens at the end of the year long
              waiting period. Ben would like to build in a recovery mechanism so
              that if Alyssa doesn’t claim the tokens, they can be recovered.
              This way, the tokens won’t be lost forever.
            </p>
            <p>Note: In this example the escrow is valid for 2 minutes.</p>
            <Divider />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row centered>
          <Grid.Column width="5">
            {this.getAccount("Source", "source", "home")}
          </Grid.Column>
          <Grid.Column width="2" />
          <Grid.Column width="5">
            {this.getAccount("Destination", "destination", "university")}
          </Grid.Column>
        </Grid.Row>
        <Grid.Row centered>
          <Grid.Column width="5">
            {this.getAccount("Escrow", "escrow", "lock")}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }
}

function mapStateToProps({ source, destination, escrow }) {
  return { source, destination, escrow };
}

export default connect(mapStateToProps, actions)(Home);
