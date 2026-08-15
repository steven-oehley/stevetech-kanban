import { jwtVerify, type JWTPayload } from "jose";

import { HOST_URL } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * OpenID Connect Back-Channel Logout 1.0, receiving side.
 *
 * Clearing a cookie only stops *this* browser from presenting a session — the
 * session row stays valid until it expires, so anyone who captured the cookie
 * value keeps a working session. A real logout has to revoke server-side, and
 * only the host knows a logout happened. So the host calls this endpoint
 * directly, server-to-server, with a signed Logout Token.
 *
 * The token is signed HS256 with the OAuth client secret this zone already
 * shares with the host. That is a legitimate OIDC signing option for a
 * confidential client, and it means no extra key distribution: the same secret
 * that authenticates us at the token endpoint authenticates the host here.
 */

const LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

/** The host's OIDC issuer — the `iss` its tokens carry. */
const EXPECTED_ISSUER = `${HOST_URL}/api/auth`;

/** Logout Tokens are single-use and short-lived; anything older is rejected. */
const MAX_TOKEN_AGE_SECONDS = 120;

export class LogoutTokenError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example.`);
  return value;
}

/**
 * Validates the Logout Token per §2.6 of the spec and returns the host user id
 * it identifies. Throws on anything suspicious — this endpoint is unauthenticated
 * apart from the signature, so every claim is checked before it is trusted.
 */
async function verifyLogoutToken(token: string): Promise<string> {
  const secret = new TextEncoder().encode(requireEnv("KANBAN_CLIENT_SECRET"));

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"], // Pinned: never let the token pick its own alg.
      issuer: EXPECTED_ISSUER,
      audience: requireEnv("KANBAN_CLIENT_ID"),
      maxTokenAge: MAX_TOKEN_AGE_SECONDS,
      clockTolerance: 30,
    }));
  } catch (cause) {
    throw new LogoutTokenError("Logout token failed verification", { cause });
  }

  // §2.6: a Logout Token must not contain a nonce. Its presence means this is
  // really an ID Token being replayed as a logout instruction.
  if ("nonce" in payload) {
    throw new LogoutTokenError("Logout token must not carry a nonce");
  }

  const events = payload.events as Record<string, unknown> | undefined;
  if (!events || typeof events !== "object" || !(LOGOUT_EVENT in events)) {
    throw new LogoutTokenError("Logout token is missing the logout event");
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new LogoutTokenError("Logout token is missing a subject");
  }

  if (typeof payload.jti !== "string" || !payload.jti) {
    throw new LogoutTokenError("Logout token is missing a jti");
  }

  await consumeJti(payload.jti);

  return payload.sub;
}

/**
 * Replay protection. The verification table's primary key is the uniqueness
 * constraint, so a second delivery of the same jti fails the insert rather than
 * racing a read — no extra migration, and no window between check and write.
 */
async function consumeJti(jti: string): Promise<void> {
  try {
    await prisma.verification.create({
      data: {
        id: `backchannel-logout:${jti}`,
        identifier: `backchannel-logout:${jti}`,
        value: "consumed",
        expiresAt: new Date(Date.now() + MAX_TOKEN_AGE_SECONDS * 2 * 1000),
      },
    });
  } catch {
    throw new LogoutTokenError("Logout token has already been used");
  }
}

/**
 * Best-effort revocation of the access token this zone holds for the user, so
 * it cannot be used against the host's userinfo endpoint after logout. Failure
 * here must not fail the logout — the session revocation below is what matters.
 */
async function revokeHostTokens(accessToken: string): Promise<void> {
  try {
    const discovery = await fetch(
      `${HOST_URL}/api/auth/.well-known/openid-configuration`,
    ).then((response) => response.json());

    if (typeof discovery?.revocation_endpoint !== "string") return;

    await fetch(discovery.revocation_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(
          `${requireEnv("KANBAN_CLIENT_ID")}:${requireEnv("KANBAN_CLIENT_SECRET")}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        token: accessToken,
        token_type_hint: "access_token",
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("[backchannel-logout] Token revocation failed:", error);
  }
}

/**
 * Handles a verified logout: revokes every session this zone holds for the
 * user, and clears the OAuth tokens stored against their account.
 */
export async function handleBackchannelLogout(token: string): Promise<void> {
  const subject = await verifyLogoutToken(token);

  // `accountId` is the host's user id (the `sub` in its tokens), which is how
  // this zone's local user maps back to the host's.
  const account = await prisma.account.findFirst({
    where: { providerId: "host", accountId: subject },
    select: { id: true, userId: true, accessToken: true },
  });

  // Unknown subject is not an error: logout is idempotent, and answering
  // differently would leak whether a given user has ever used this zone.
  if (!account) return;

  const revoked = await prisma.session.deleteMany({
    where: { userId: account.userId },
  });

  await prisma.account.update({
    where: { id: account.id },
    data: { accessToken: null, refreshToken: null, idToken: null },
  });

  if (account.accessToken) {
    await revokeHostTokens(account.accessToken);
  }

  console.info(
    `[backchannel-logout] Revoked ${revoked.count} session(s) for user ${account.userId}.`,
  );
}
