"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
        // On success the browser has already left for the host.
        if (error) setPending(false);
      }}
    >
      {pending ? "Redirecting…" : "Continue with SteveTech"}
    </Button>
  );
}
