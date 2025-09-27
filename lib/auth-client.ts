import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const signInWithGithub = () => {
  return authClient.signIn.social({
    provider: "github",
    callbackURL: "/",
  });
};

export const signOut = async () => {
  return authClient.signOut();
};
