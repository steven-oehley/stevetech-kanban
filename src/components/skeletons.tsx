import { cn } from "@/lib/utils";

/**
 * Loading scaffolding.
 *
 * These deliberately mirror the real layout's shape — same card grid, same
 * heading block — so the page doesn't visibly reflow when content replaces
 * them. A generic centred spinner is easier to write and worse to look at: it
 * throws away the one piece of information we have, which is what is coming.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div className="rounded-xl border p-5" key={index}>
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="mt-4 h-5 w-24" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-2/3" />
          <Skeleton className="mt-6 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
