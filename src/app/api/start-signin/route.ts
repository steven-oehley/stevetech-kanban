import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { HOST_URL, auth } from "@/lib/auth";

/**
 * Silent zone sign-in.
 *
 * The host owns identity, so somebody who already has a host session should
 * never be asked to sign in a second time just because this zone keeps its own
 * session. The proxy sends sessionless traffic here instead of to /login, and
 * this route starts the handshake server-side and 302s the browser at the host.
 * Both first-party clients are registered with `skipConsent`, so the whole
 * round trip is invisible — the user goes from the launcher to the board.
 *
 * `sign-in/oauth2` is POST-only and writes the PKCE verifier and state on its
 * own response, so we call it and carry those Set-Cookie headers onto the
 * redirect. Rebuilding the authorize URL by hand would leave the verifier
 * unstored and every callback would fail `state_mismatch`.
 */
const LOGIN_PATH = "/kanban/login";

/**
 * Breaks the redirect loop that would otherwise form if the callback keeps
 * failing to leave a usable session behind: /kanban → here → host → callback →
 * /kanban → here, forever. Short-lived so it self-clears well inside one round
 * trip and never blocks a later legitimate sign-in.
 */
const LOOP_GUARD = "kanban.signin_started";
const LOOP_GUARD_SECONDS = 30;

function loginRedirect() {
  return NextResponse.redirect(new URL(LOGIN_PATH, HOST_URL));
}

export async function GET(request: NextRequest) {
  // Already been through here and still arrived without a session — something
  // upstream is broken, so fall back to the manual page rather than bouncing
  // the user through the host indefinitely.
  if (request.cookies.has(LOOP_GUARD)) {
    return loginRedirect();
  }

  let started: Response;
  try {
    started = await auth.api.signInWithOAuth2({
      body: { providerId: "host", callbackURL: "/kanban" },
      headers: await headers(),
      asResponse: true,
    });
  } catch (error) {
    console.error("[start-signin] Could not start the host handshake:", error);
    return loginRedirect();
  }

  const { url } = (await started.json()) as { url?: string };
  if (!url) return loginRedirect();

  const redirect = NextResponse.redirect(url);

  for (const cookie of started.headers.getSetCookie()) {
    redirect.headers.append("set-cookie", cookie);
  }

  redirect.cookies.set(LOOP_GUARD, "1", {
    maxAge: LOOP_GUARD_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/kanban",
    secure: HOST_URL.startsWith("https://"),
  });

  return redirect;
}
