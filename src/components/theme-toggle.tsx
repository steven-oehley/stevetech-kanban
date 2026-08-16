"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from "@/lib/theme";

/**
 * Writes the preference where the server will find it on the next request, and
 * where the other zones will find it too — `path=/` is what makes one click on
 * the dashboard also darken Timer and Kanban, since all three are served from
 * this origin.
 */
function persist(theme: Theme) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

/**
 * Holds no React state on purpose.
 *
 * The source of truth is the `dark` class on <html>, which the server sets from
 * the cookie and the init script may correct before paint. Mirroring that into
 * state means synchronising the two on mount, and the copy is always the one
 * that can be wrong. Instead the click reads the DOM, and the icons are driven
 * by the `dark:` variant — so the button is correct on the first frame, with no
 * hydration pass and nothing to keep in sync.
 */
export function ThemeToggle() {
  function toggle() {
    const next: Theme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";

    document.documentElement.classList.toggle("dark", next === "dark");
    persist(next);
  }

  return (
    <Button onClick={toggle} size="icon-sm" variant="ghost">
      {/*
        Both icons stay mounted and cross-fade rather than swapping, so the
        button never reflows as the glyph changes.
      */}
      <span className="relative flex size-4 items-center justify-center">
        <SunIcon className="absolute size-4 scale-100 rotate-0 opacity-100 transition-all duration-200 dark:scale-75 dark:rotate-90 dark:opacity-0" />
        <MoonIcon className="absolute size-4 scale-75 -rotate-90 opacity-0 transition-all duration-200 dark:scale-100 dark:rotate-0 dark:opacity-100" />
      </span>

      {/*
        The accessible name, swapped by the same class rather than by state.
        `hidden`/`dark:block` decides which one exists for a screen reader;
        `sr-only` keeps whichever is live out of the visual layout.
      */}
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:block">Switch to light theme</span>
    </Button>
  );
}
