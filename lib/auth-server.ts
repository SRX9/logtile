import { headers } from "next/headers";

import { auth } from "./auth";

export const isServerLoggedIn = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return { user: session?.user, isLoggedIn: !!session?.user };
};
