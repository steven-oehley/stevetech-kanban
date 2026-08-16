import { cn } from "@/lib/utils";

/**
 * The one spinner for the whole platform.
 *
 * `currentColor` on the leading edge and a faded ring behind it means it adopts
 * whatever it is placed on — inside a primary button, next to muted text, over
 * a card — without a variant per context.
 */
export function Spinner({
  className,
  label,
}: {
  className?: string;
  /**
   * Announced to screen readers. Omit only when a visible label sits beside it
   * and already says the same thing, so it isn't read out twice.
   */
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      className={cn(
        "border-current/25 border-t-current inline-block size-4 shrink-0 animate-spin rounded-full border-2",
        className,
      )}
      role={label ? "status" : undefined}
    />
  );
}
