import { ZoneLink } from "@/components/zone-link";
import { HOST_URL } from "@/lib/auth";

/**
 * Cross-zone links are plain <a> tags, never next/link: /dashboard belongs to
 * the host app, and the client router knows nothing about it. ZoneLink wraps
 * one so the full page load it triggers isn't silent.
 */
export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-semibold">Kanban</span>
          <span className="text-muted-foreground text-sm">{userName}</span>
        </div>
        <nav className="flex items-center gap-4">
          <ZoneLink
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            href={`${HOST_URL}/dashboard`}
            pendingLabel="Opening Dashboard…"
          >
            ← Dashboard
          </ZoneLink>

          {/* The host owns identity, so it owns sign-out too — this zone never
              ends a session itself, it hands the browser back to the host. */}
          <ZoneLink
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            href={`${HOST_URL}/sign-out`}
            pendingLabel="Signing out…"
          >
            Log out
          </ZoneLink>
        </nav>
      </div>
    </header>
  );
}
