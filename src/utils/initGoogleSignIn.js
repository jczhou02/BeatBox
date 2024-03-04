function initGoogleSignIn(setIsSignedIn) {
  window.gapi.load("auth2", () => {
    window.gapi.auth2
      .init({
        client_id: process.env.REACT_APP_AUTH_CLIENT_ID,
      })
      .then(() => {
        const authInstance = window.gapi.auth2.getAuthInstance();
        const isSignedIn = authInstance.isSignedIn.get();
        setIsSignedIn(isSignedIn);

        authInstance.isSignedIn.listen((isSignedIn) => {
          setIsSignedIn(isSignedIn);
        });
      });
  });
  window.gapi.load("signin2", () => {
    window.gapi.signin2.render("login-button", {
      theme: "dark",
    });
  });
}

export default initGoogleSignIn;