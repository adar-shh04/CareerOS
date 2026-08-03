import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getApiBaseUrl } from "./config";

export const authClient = createAuthClient({
  baseURL: `${getApiBaseUrl()}/api/auth`,
  plugins: [organizationClient()],
  fetchOptions: {
    onSuccess(context) {
      const token = context.response.headers.get("set-auth-token");

      if (token) {
        localStorage.setItem("auth-token", token);
      }
    },

    headers: () => {
      const token = localStorage.getItem("auth-token");

      return token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {};
    },
  },
});

export const { useSession, signIn, signUp, signOut, organization } =
  authClient;