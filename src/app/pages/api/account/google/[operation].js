import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import passport from "passport";
import Google, {
  IOAuth2StrategyOption,
  Profile,
  VerifyFunction,
} from "passport-google-oauth";
import { findUser, sendWelcomeEmail } from "@/app/account/actions";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { createUserFromProvider } from "../lib";
import { get } from "lodash";
import { getSecureCookie } from "@/app/lib/services/cookies";

dayjs.extend(duration);

passport.use(
  new Google(
    {
      clientID: process.env.NEXT_PUBLIC_GOOGLE_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_SECRET,
      callbackURL: process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) => {
      done(null, profile);
    }
  )
);

const router = createRouter();

router.get((req, res, next) => {
  if (req.query.operation === "auth") {
    return passport.authenticate("google", { scope: ["profile", "email"] })(
      req,
      res,
      next
    );
  } else if (req.query.operation === "callback") {
    return passport.authenticate(
      "google",
      async (err, profile, info) => {
        if (err) {
          res.status(500).end();
          return;
        }
        let user = await findUser({
          email: profile.emails[0].value,
        });
        if (!user) {
          user = await createUserFromProvider({
            profile,
            identityProvider: "GOOGLE",
          });
          setTimeout(async () => {
            await sendWelcomeEmail({ email: user.email });
          }, 0);
        } else if (user.identityProvider !== "GOOGLE") {
          res.redirect("/?error=exists_with_different_identity");
          return;
        }
        const cookie = await getSecureCookie({
          name: "user",
          value: {
            email: user.email,
            id: user.id,
            photo: get(profile, "photos[0].value", ""),
            name: get(profile, "displayName", ""),
            username: user.username,
          },
        });
        res.setHeader("Set-Cookie", cookie);
        res.redirect("/profile");
      }
    )(req, res, next);
  } else {
    res.status(400).json({ error: "Unknown operation." });
  }
});

module.exports = router.handler({
  onError: (err, req, res) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).end(err.message);
  },
});
