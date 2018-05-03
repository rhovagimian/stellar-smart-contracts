import React, { Component } from "react";
import { Grid } from "semantic-ui-react";
import Account from "./Account";
import { connect } from "react-redux";
import * as actions from "../actions";

class Home extends Component {
  componentWillMount() {
    this.props.createAccounts();
  }

  getAccount(title, key) {
    if (this.props[key]) {
      return (
        <Account
          title={title}
          account={this.props[key]}
          showButtons={this.props.escrow && key !== "escrow"}
        />
      );
    }
    return <div />;
  }

  render() {
    return (
      <Grid>
        <Grid.Row centered>
          <Grid.Column width="1" />
        </Grid.Row>
        <Grid.Row centered>
          <Grid.Column width="5">
            {this.getAccount("Source", "source")}
          </Grid.Column>
          <Grid.Column width="2" />
          <Grid.Column width="5">
            {this.getAccount("Destination", "destination")}
          </Grid.Column>
        </Grid.Row>
        <Grid.Row centered>
          <Grid.Column width="5">
            {this.getAccount("Escrow", "escrow")}
          </Grid.Column>
        </Grid.Row>
      </Grid>
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
