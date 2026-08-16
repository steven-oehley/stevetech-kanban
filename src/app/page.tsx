import { AppHeader } from "@/components/app-header";
import { Board } from "@/components/board";
import { prisma } from "@/lib/prisma";
import { requireLicensedUser } from "@/lib/session";

export default async function BoardPage() {
  const user = await requireLicensedUser();

  const cards = await prisma.card.findMany({
    where: { userId: user.id },
    orderBy: [{ column: "asc" }, { order: "asc" }],
    select: { id: true, title: true, column: true, order: true },
  });

  return (
    <>
      <AppHeader userName={user.name} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your board</h1>
          <p className="text-muted-foreground text-sm">
            Drag a card between columns — it saves as you drop it.
          </p>
        </div>

        <Board cards={cards} />
      </main>
    </>
  );
}
