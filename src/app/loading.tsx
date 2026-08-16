import { Skeleton } from "@/components/skeletons";

/**
 * The board's own fallback. Reaching this page can involve a full OAuth round
 * trip through the host, so the gap it covers is longer here than anywhere on
 * the host itself.
 */
export default function BoardLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, column) => (
          <div className="flex flex-col gap-3" key={column}>
            <Skeleton className="h-5 w-24" />
            <div className="bg-muted/40 flex min-h-40 flex-col gap-2 rounded-xl p-2">
              {/* Fewer cards in each successive column, so the placeholder
                  looks like a board rather than a grid of identical blocks. */}
              {Array.from({ length: 3 - column }, (_, card) => (
                <Skeleton className="h-14 w-full rounded-lg" key={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
