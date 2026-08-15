import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";

import { prisma } from "@/lib/prisma";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example.`);
  }
  return value;
}

/** The host owns all identity; this app is only one of its OAuth clients. */
export const HOST_URL = process.env.HOST_URL ?? "http://localhost:3000";

const DISCOVERY_URL = `${HOST_URL}/api/auth/.well-known/openid-configuration`;

/** Resolved once per process — the document is static for a given host. */
let userInfoEndpoint: Promise<string> | undefined;

function getUserInfoEndpoint(): Promise<string> {
  userInfoEndpoint ??= fetch(DISCOVERY_URL)
    .then((response) => response.json())
    .then((document) => {
      const endpoint = document?.userinfo_endpoint;
      if (typeof endpoint !== "string") {
        throw new Error("Host discovery document has no userinfo_endpoint.");
      }
      return endpoint;
    })
    .catch((error) => {
      userInfoEndpoint = undefined; // Let the next sign-in retry.
      throw error;
    });

  return userInfoEndpoint;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Better Auth runs here ONLY as an OIDC *client* of the host. There is no
 * email/password, no signup, no organization management in this zone.
 *
 * `baseURL` is deliberately the bare host origin rather than BETTER_AUTH_URL
 * (= HOST_URL + "/kanban"): Better Auth's `withPath()` only appends `basePath`
 * to a URL that has no path of its own, so passing the /kanban form would
 * resolve the auth base to http://localhost:3000/kanban and the OAuth callback
 * would no longer match the redirect_uri registered on the host. Passing the
 * origin lets `basePath` produce the correct
 * http://localhost:3000/kanban/api/auth.
 */
export const auth = betterAuth({
  baseURL: HOST_URL,
  basePath: "/kanban/api/auth",
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // The host serves this zone under its own origin, so the session cookie is
  // written for localhost:3000 alongside the host's. The prefix is what keeps
  // the two from colliding — and it is what the proxy checks for.
  advanced: { cookiePrefix: "kanban" },

  user: {
    additionalFields: {
      /**
       * Mirror of the host's `entitlements` userinfo claim, refreshed on every
       * sign-in. Authorization is still re-checked on each request from this
       * column — never from anything the browser sends.
       */
      entitlements: {
        type: "string[]",
        required: false,
        defaultValue: [],
      },
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "host",
          clientId: requireEnv("KANBAN_CLIENT_ID"),
          clientSecret: requireEnv("KANBAN_CLIENT_SECRET"),
          discoveryUrl: DISCOVERY_URL,
          scopes: ["openid", "profile", "email"],
          pkce: true,

          /**
           * Better Auth's default reads the profile out of the id_token and
           * never calls userinfo — but `entitlements` is a userinfo-only claim
           * on the host, so it would never arrive. Call userinfo explicitly.
           */
          getUserInfo: async (tokens) => {
            const response = await fetch(await getUserInfoEndpoint(), {
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });

            if (!response.ok) {
              throw new Error(
                `Host userinfo request failed with ${response.status}.`,
              );
            }

            const profile = await response.json();

            return {
              id: profile.sub,
              email: profile.email,
              emailVerified: profile.email_verified ?? false,
              name: profile.name,
              image: profile.picture,
              entitlements: toStringArray(profile.entitlements),
            };
          },

          // Licenses change on the host, so re-read the claim on every sign-in
          // rather than only when the local user row is first created.
          overrideUserInfo: true,
          // `mapProfileToUser` is typed against Better Auth's base user, so the
          // additional `entitlements` field has to be cast past it.
          mapProfileToUser: (profile) =>
            ({
              entitlements: toStringArray(profile.entitlements),
            }) as Record<string, unknown>,
        },
      ],
    }),

    // Must stay last: it writes Set-Cookie headers for the Next.js server.
    nextCookies(),
  ],
});
