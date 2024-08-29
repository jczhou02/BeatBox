import { OAuth2Client } from 'google-auth-library';
import { findUser, createUserFromProvider, sendWelcomeEmail } from '@/app/account/actions';
import { getSecureCookie, setSecureCookie } from '@/app/lib/services/cookies';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { token } = req.body;

  try {
    // Verify the token from Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.NEXT_PUBLIC_GOOGLE_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if the user already exists in the database
    let user = await findUser({ email });

    if (!user) {
      // Create a new user if one doesn't exist
      user = await createUserFromProvider({
        profile: payload,
        identityProvider: "GOOGLE",
      });

      // Send a welcome email to the new user
      setTimeout(async () => {
        await sendWelcomeEmail({ email });
      }, 0);
    } else if (user.identityProvider !== "GOOGLE") {
      // Handle the case where the user exists but with a different identity provider
      return res.status(400).json({ error: "User exists with a different identity provider." });
    }

    // Set a secure cookie for the user session
    const cookie = setSecureCookie(res, "user", {
      email: user.email,
      id: user.id,
      photo: picture,
      name: name,
      username: user.username,
    });

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ message: "User authenticated successfully." });

  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
