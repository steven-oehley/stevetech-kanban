"use server";

import { revalidatePath } from "next/cache";

import { toBoardColumn } from "@/lib/board";
import { prisma } from "@/lib/prisma";
import { requireLicensedUser } from "@/lib/session";

/**
 * Server actions are public HTTP endpoints, so each one re-verifies the
 * session AND the "kanban" entitlement before touching the database — the
 * proxy's cookie check does not carry over to them.
 */

const MAX_TITLE_LENGTH = 200;

export async function createCard(formData: FormData) {
  const user = await requireLicensedUser();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  // New cards go to the top of To Do, so `order` counts down from the current
  // minimum rather than up from the maximum.
  const top = await prisma.card.aggregate({
    where: { userId: user.id, column: "TODO" },
    _min: { order: true },
  });

  await prisma.card.create({
    data: {
      userId: user.id,
      title: title.slice(0, MAX_TITLE_LENGTH),
      column: "TODO",
      order: (top._min.order ?? 0) - 1,
    },
  });

  revalidatePath("/");
}

export async function deleteCard(formData: FormData) {
  const user = await requireLicensedUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Scoped by userId as well as id: a guessed id from another user matches
  // nothing rather than deleting their card.
  await prisma.card.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/");
}

/**
 * Persists a drop. The client sends the full, final id order of the target
 * column, which is the only way the server can know where between two cards
 * the dragged one landed. Every id is still re-checked against this user's
 * cards before anything is written.
 */
export async function moveCard(input: {
  cardId: string;
  column: string;
  orderedIds: string[];
}) {
  const user = await requireLicensedUser();

  const column = toBoardColumn(input.column);
  if (!column || !input.cardId) return;

  const owned = await prisma.card.findMany({
    where: { userId: user.id, id: { in: [...input.orderedIds, input.cardId] } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((card) => card.id));

  if (!ownedIds.has(input.cardId)) return;

  // Drop any id the client sent that isn't this user's, then make sure the
  // dragged card is present even if the client's list was incomplete.
  const ids = input.orderedIds.filter((id) => ownedIds.has(id));
  if (!ids.includes(input.cardId)) ids.push(input.cardId);

  // Rewrite the whole column's positions in one transaction so the result can
  // never be a partially-applied order.
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.card.updateMany({
        where: { id, userId: user.id },
        data: { column, order: index },
      }),
    ),
  );

  revalidatePath("/");
}
