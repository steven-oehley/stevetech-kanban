import { auth } from "@/lib/auth";

/**
 * Served at /kanban/api/auth/* in the browser.
 *
 * Next strips this app's basePath from `request.url` before a route handler
 * sees it, so Better Auth — which is configured with the browser-facing
 * basePath "/kanban/api/auth", because that is what it must build the OAuth
 * redirect_uri from — would be handed "/api/auth/..." and match no route at
 * all. Put the zone prefix back before handing the request over.
 */
const ZONE_PREFIX = "/kanban";

function withZonePrefix(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname.startsWith(`${ZONE_PREFIX}/`)) return request;

  url.pathname = `${ZONE_PREFIX}${url.pathname}`;

  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: request.signal,
    // Node requires this whenever a body stream is passed through.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

export async function GET(request: Request) {
  return auth.handler(withZonePrefix(request));
}

export async function POST(request: Request) {
  return auth.handler(withZonePrefix(request));
}
