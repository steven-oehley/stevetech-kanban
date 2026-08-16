import { ArrowLeftIcon, LogOutIcon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { ZoneLink } from "@/components/zone-link";
import { HOST_URL } from "@/lib/auth";

/**
 * Deliberately echoes the host's header — same height, same brand mark, same
 * placement for the theme control — so crossing from the dashboard into this
 * app doesn't feel like arriving at a different product. The zones are separate
 * deployments; the user should never be able to tell.
 *
 * Cross-zone links are plain <a> tags, never next/link: /dashboard belongs to
 * the host app, and the client router knows nothing about it. ZoneLink wraps
 * one so the full page load it triggers isn't silent.
 */
export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-6">
        <ZoneLink
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-md text-sm outline-none transition-colors focus-visible:ring-3"
          href={`${HOST_URL}/dashboard`}
          pendingLabel="Opening Dashboard…"
        >
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </ZoneLink>

        <span aria-hidden className="bg-border h-5 w-px" />

        <div className="flex flex-1 items-center gap-2">
          <span
            aria-hidden
            className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-[0.6875rem] font-bold"
          >
            K
          </span>
          <span className="font-semibold tracking-tight">Kanban</span>
        </div>

        <span className="text-muted-foreground hidden text-sm sm:inline">
          {userName}
        </span>

        <ThemeToggle />

        {/* The host owns identity, so it owns sign-out too — this zone never
            ends a session itself, it hands the browser back to the host. */}
        <ZoneLink
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-md text-sm outline-none transition-colors focus-visible:ring-3"
          href={`${HOST_URL}/sign-out`}
          pendingLabel="Signing out…"
        >
          <LogOutIcon className="size-4" />
          <span className="hidden sm:inline">Log out</span>
        </ZoneLink>
      </div>
    </header>
  );
}
