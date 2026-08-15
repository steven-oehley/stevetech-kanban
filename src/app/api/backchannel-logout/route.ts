import {
  LogoutTokenError,
  handleBackchannelLogout,
} from "@/lib/backchannel-logout";

/**
 * OIDC Back-Channel Logout endpoint, served at /kanban/api/backchannel-logout.
 *
 * Called server-to-server by the host — never by a browser — so there is no
 * session or cookie involved. The signed Logout Token is the only credential,
 * and it is verified in full before anything is revoked.
 */
export async function POST(request: Request): Promise<Response> {
  // Spec requires no-store on both the request handling and the response.
  const headers = { "cache-control": "no-store" };

  let logoutToken: string | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      logoutToken = (await request.formData()).get("logout_token") as
        | string
        | null;
    } else {
      logoutToken = (await request.json())?.logout_token ?? null;
    }
  } catch {
    logoutToken = null;
  }

  if (typeof logoutToken !== "string" || !logoutToken) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing logout_token." },
      { status: 400, headers },
    );
  }

  try {
    await handleBackchannelLogout(logoutToken);
  } catch (error) {
    if (error instanceof LogoutTokenError) {
      console.warn("[backchannel-logout] Rejected token:", error.message);
      return Response.json(
        { error: "invalid_request", error_description: error.message },
        { status: 400, headers },
      );
    }

    console.error("[backchannel-logout] Failed:", error);
    return Response.json(
      { error: "server_error" },
      { status: 500, headers },
    );
  }

  return new Response(null, { status: 204, headers });
}
