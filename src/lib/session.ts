import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { HOST_URL, auth } from "@/lib/auth";

/** The app key this zone is licensed under, as it appears in the host's claim. */
const APP_KEY = "kanban";

/**
 * Relative, without the /kanban prefix: Next prepends this app's basePath to
 * `redirect()` targets, so this reaches the browser as /kanban/api/start-signin
 * — and the browser resolves that against the host's origin, since every
 * request arrives through the host proxy.
 *
 * This re-runs the handshake rather than pointing at /login, because the case
 * that lands here is a *stale* session cookie: the proxy only tests that the
 * cookie exists, so an expired or revoked one sails past it and fails here
 * instead. Sending those users to a login button would strand anybody holding
 * one behind a manual click forever — they have a perfectly good host session,
 * so just spend it. start-signin's loop guard falls back to /kanban/login if
 * the handshake still doesn't produce a usable session.
 */
const SIGN_IN_PATH = "/api/start-signin";
const NO_LICENSE_URL = `${HOST_URL}/dashboard?error=no-license`;

export type LicensedUser = {
  id: string;
  name: string;
  email: string;
};

/**
 * The single authorization gate for this app. Every page and every server
 * action calls it — a server action is a public HTTP endpoint, so the proxy's
 * cookie check is never enough on its own.
 *
 * Entitlements are read from the local user row (mirrored from the host's
 * userinfo claim at sign-in), never from anything the client sends.
 */
export async function requireLicensedUser(): Promise<LicensedUser> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  const entitlements = (session.user as { entitlements?: unknown }).entitlements;
  const licensed =
    Array.isArray(entitlements) && entitlements.includes(APP_KEY);

  if (!licensed) {
    redirect(NO_LICENSE_URL);
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
