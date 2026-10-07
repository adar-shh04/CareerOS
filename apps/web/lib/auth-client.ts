import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getApiBaseUrl } from "./config";

export const authClient = createAuthClient({
  baseURL: `${getApiBaseUrl()}/api/auth`,
  plugins: [organizationClient()],
});

export const { useSession, signIn, signUp, signOut, organization } =
  authClient;