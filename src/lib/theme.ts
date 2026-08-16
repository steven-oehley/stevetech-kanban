/**
 * Theme preference, shared across the whole platform.
 *
 * A cookie rather than localStorage, for two reasons. The server can read it,
 * so the correct class is on <html> in the first byte of HTML and there is no
 * flash of the wrong theme. And every zone is served from the host's origin, so
 * one cookie set here is sent to Timer and Kanban too — switching to dark on the
 * dashboard means the board is already dark when you open it.
 *
 * This module is imported from both server and client code, so it must stay
 * free of `next/headers` and anything else that pins it to one environment.
 */
export const THEME_COOKIE = "stevetech-theme";

/** A year: the preference should outlive the session that set it. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Theme = "light" | "dark";

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Runs before first paint, and only matters for somebody who has never chosen:
 * the server has no way to know the OS preference, so it renders light and this
 * corrects to dark immediately if that is what the machine asks for. Once the
 * toggle writes a cookie this becomes a no-op.
 *
 * Kept as a string so it can be inlined into <head> — a normal component would
 * hydrate too late and the flash is exactly what we are avoiding.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (document.cookie.indexOf('${THEME_COOKIE}=') !== -1) return;
    if (!window.matchMedia('(prefers-color-scheme: dark)').matches) return;
    document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();
