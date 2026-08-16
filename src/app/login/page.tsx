import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { SignInButton } from "./sign-in-button";

/**
 * The manual fallback. Nobody should normally get here: the proxy sends
 * sessionless traffic through api/start-signin, which completes the handshake
 * against the host without any interaction. This page is what that route falls
 * back to when it cannot get the user in.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold"
        >
          K
        </span>
        <span className="font-semibold tracking-tight">Kanban</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to continue</CardTitle>
          <CardDescription>
            Kanban uses your SteveTech account. You&apos;ll be sent to the host
            to sign in, then brought straight back to your board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">Part of SteveTech</p>
    </main>
  );
}
