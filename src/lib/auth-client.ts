"use client";

import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * No `baseURL`: the browser only ever reaches this app through the host proxy,
 * so the current origin plus this zone's auth basePath is always correct — in
 * dev (localhost:3000) and in prod (stevetech.co.za) alike.
 */
export const authClient = createAuthClient({
  basePath: "/kanban/api/auth",
  plugins: [genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
