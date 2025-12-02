import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { resolveAuthBaseUrl, resolveExpoScheme } from "../config/env";

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(), // Base URL of your Better Auth backend
  plugins: [
    expoClient({
      scheme: resolveExpoScheme(),
      storagePrefix: "airwig",
      storage: SecureStore,
    })
  ]
});

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;

