import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed Middleware to Proxy (`middleware.ts` is deprecated).
 *
 * This is an optimistic check only — it looks for the session cookie and
 * nothing more. Real authorization (session validity + the "kanban"
 * entitlement) is re-verified in every page and every server action, in
 * src/lib/session.ts.
 */
const SESSION_COOKIE = "kanban.session_token";

/**
 * Better Auth prefixes its cookies with `__Secure-` whenever the resolved
 * baseURL is https — so the very same cookie is `kanban.session_token` against
 * localhost and `__Secure-kanban.session_token` in production. Checking only the
 * bare name passes in dev and then bounces every signed-in user straight back to
 * /kanban/login on the live site.
 *
 * Better Auth's own session lookup tries both spellings, and the host's
 * sign-out action strips the prefix for the same reason; this mirrors them.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(`__Secure-${SESSION_COOKIE}`)
  );
}

/**
 * The browser always reaches this zone through the host's proxy, so a redirect
 * must point at the host's origin (localhost:3000 / stevetech.co.za) — never at
 * this app's own port, which would drop the user out of the proxy and break the
 * cookie flow.
 *
 * That origin comes from configuration, never from the request. `x-forwarded-*`
 * is set by the proxy but is trivially forged by anyone who can reach this app
 * directly, and building a redirect from it would turn this into an open
 * redirect: `x-forwarded-host: evil.example` would bounce users to an
 * attacker's copy of the login page.
 */
function publicOrigin(request: NextRequest): string {
  return process.env.HOST_URL ?? request.nextUrl.origin;
}

export function proxy(request: NextRequest) {
  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  // The prefix is spelled out here: this is an absolute URL on the *host's*
  // origin, which Next passes through untouched rather than prepending the
  // app's basePath to (unlike `redirect()` in a page — see lib/session.ts).
  const loginUrl = new URL("/kanban/login", publicOrigin(request));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  /**
   * Paths are matched against this zone's basePath, so "/login" here is
   * /kanban/login in the browser. Everything that must stay reachable without a
   * session is excluded: the login page itself and the whole auth API (the
   * OAuth handshake with the host runs through it before any cookie exists).
   */
  matcher: [
    // "/" is listed on its own: the negative-lookahead pattern below does not
    // match the bare root, which is this app's only real page.
    "/",
    // api/backchannel-logout is excluded too: the host calls it server-to-server
    // with no cookie, and it authenticates itself with a signed Logout Token.
    "/((?!login|api/auth|api/backchannel-logout|_next/static|_next/image|favicon.ico).*)",
  ],
};
