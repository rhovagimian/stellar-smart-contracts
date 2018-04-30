import React from "react";
import { BrowserRouter, Route } from "react-router-dom";

import Home from "./Home";

const App = () => {
  return (
    <div className="container-fluid">
      <BrowserRouter>
        <div>
          <Route exact path="/" component={Home} />
        </div>
      </BrowserRouter>
    </div>
  );
};

export default App;
