import React, { useState } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import initGoogleSignIn from "./utils/initGoogleSignIn";

import CheckingSignedIn from "./pages/CheckingSignedIn";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Private from "./pages/Private";
import PageNotFound from "./pages/PageNotFound";

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(null);
  const script = document.createElement("script");
  script.src = "https://apis.google.com/js/platform.js";
  script.onload = () => initGoogleSignIn(setIsSignedIn);
  document.body.appendChild(script);

  function PrivateRoute(props) {
    const { component, ...rest } = props;
    return <Route {...rest} component={isSignedIn ? component : Private} />;
  }

  if (isSignedIn !== null) {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/" component={Home} />
          <PrivateRoute exact path="/profile" component={Profile} />
          <Route path="/" component={PageNotFound} />
        </Switch>
      </BrowserRouter>
    );
  }

  return <CheckingSignedIn />;
}
