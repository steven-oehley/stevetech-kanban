"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";

/**
 * The entire login UI of this app. It hands the browser to the host, which owns
 * every credential — this zone never sees a password.
 */
export function SignInButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await signIn.oauth2({
          providerId: "host",
          // This app's "/" is /kanban to the browser: the callback URL is
          // resolved against the host's origin, not against our basePath.
          callbackURL: "/kanban",
        });
        // On success the browser has already left for the host — the pending
        // state deliberately stays up until it does, so the button never
        // returns to idle while a navigation is still in flight.
        if (error) setPending(false);
      }}
      size="lg"
    >
      {pending && <Spinner />}
      {pending ? "Redirecting…" : "Continue with SteveTech"}
    </Button>
  );
}
