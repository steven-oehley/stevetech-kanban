"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

/**
 * A link to another zone of the platform.
 *
 * Zones are separate deployments, so this is a full page load rather than a
 * router transition — which means `loading.tsx` and `useLinkStatus`, both
 * client-router features, never fire for it. The browser keeps the current page
 * on screen until the next one paints, so without this a click looks like it
 * did nothing for as long as the next zone takes to authenticate and render.
 * The overlay covers exactly that gap.
 *
 * It stays a plain <a>: cross-zone navigation must never go through next/link.
 */
export function ZoneLink({
  children,
  className,
  href,
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  pendingLabel: string;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Back/forward can restore this page from the bfcache with its React state
    // intact, which would leave the overlay up over a page that has arrived.
    // `pagehide` fires once the navigation is actually committing, so clearing
    // there costs nothing visually and covers the freeze; `pageshow` is the
    // safety net for restores that skipped it.
    const clear = () => setLeaving(false);

    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", clear);

    return () => {
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", clear);
    };
  }, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified or middle click opens a new tab — this page is staying put.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    setLeaving(true);
  }

  return (
    <>
      <a className={className} href={href} onClick={handleClick}>
        {children}
      </a>

      {leaving && (
        <div
          aria-live="polite"
          className="bg-background/85 fixed inset-0 z-50 flex items-center justify-center gap-3"
          role="status"
        >
          <span className="border-muted-foreground/30 border-t-foreground size-5 animate-spin rounded-full border-2" />
          <span className="text-muted-foreground text-sm">{pendingLabel}</span>
        </div>
      )}
    </>
  );
}
