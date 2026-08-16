"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { createCard, deleteCard, moveCard } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { COLUMNS, type BoardColumn, type CardView } from "@/lib/board";
import { cn } from "@/lib/utils";

type Lists = Record<BoardColumn, CardView[]>;

function groupByColumn(cards: CardView[]): Lists {
  const lists = { TODO: [], DOING: [], DONE: [] } as Lists;

  for (const card of [...cards].sort((a, b) => a.order - b.order)) {
    lists[card.column].push(card);
  }

  return lists;
}

function findColumn(lists: Lists, cardId: string): BoardColumn | null {
  for (const { id } of COLUMNS) {
    if (lists[id].some((card) => card.id === cardId)) return id;
  }
  return null;
}

/** Tints the column header so the three lanes read apart at a glance. */
const COLUMN_ACCENT: Record<BoardColumn, string> = {
  TODO: "bg-muted-foreground/40",
  DOING: "bg-primary",
  DONE: "bg-success",
};

export function Board({ cards }: { cards: CardView[] }) {
  const [lists, setLists] = useState<Lists>(() => groupByColumn(cards));
  const [activeId, setActiveId] = useState<string | null>(null);

  // A drop rewrites the whole column's positions in a transaction, which is
  // quick but not free. The optimistic move lands instantly, so without this
  // there is no sign at all that anything is being written — and a reload
  // during that window silently loses the move.
  const [savingMove, startMoveTransition] = useTransition();

  // Re-sync whenever a server action revalidates the page: the server is the
  // source of truth, the local copy only exists to make dragging feel instant.
  // Adjusted during render rather than in an effect — React re-runs this
  // component immediately, without the extra committed frame an effect costs.
  const [renderedCards, setRenderedCards] = useState(cards);
  if (renderedCards !== cards) {
    setRenderedCards(cards);
    setLists(groupByColumn(cards));
  }

  const sensors = useSensors(
    // A small distance threshold so a click on the delete button is never
    // swallowed by an accidental drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const overId = String(over.id);

    const from = findColumn(lists, cardId);
    if (!from) return;

    // `over` is either another card or an empty column's drop area.
    const overColumn = COLUMNS.find((column) => column.id === overId)?.id;
    const to = overColumn ?? findColumn(lists, overId);
    if (!to) return;

    const source = lists[from].filter((card) => card.id !== cardId);
    const target = from === to ? source : [...lists[to]];
    const card = lists[from].find((entry) => entry.id === cardId);
    if (!card) return;

    const overIndex = target.findIndex((entry) => entry.id === overId);
    const insertAt = overIndex === -1 ? target.length : overIndex;
    target.splice(insertAt, 0, { ...card, column: to });

    const next: Lists = { ...lists, [to]: target };
    if (from !== to) next[from] = source;

    setLists(next);

    startMoveTransition(async () => {
      await moveCard({
        cardId,
        column: to,
        orderedIds: target.map((entry) => entry.id),
      });
    });
  }

  const activeCard = activeId
    ? COLUMNS.flatMap((column) => lists[column.id]).find(
        (card) => card.id === activeId,
      )
    : null;

  return (
    <DndContext
      collisionDetection={closestCorners}
      // Stable id: without it dnd-kit numbers its aria-describedby targets from
      // a global counter that starts over on the client, and every card
      // hydrates with a mismatched attribute.
      id="board"
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      {/*
        Above the grid rather than inside the To Do column. Nested, it pushed
        that one column's drop zone down by the height of the input and the
        three lanes no longer lined up — which made the board look broken
        rather than deliberate.
      */}
      <AddCardForm />

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((column) => (
          <Column
            cards={lists[column.id]}
            id={column.id}
            key={column.id}
            label={column.label}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? (
          <CardShell dragging title={activeCard.title} />
        ) : null}
      </DragOverlay>

      {/*
        Fixed to the corner rather than placed in the layout: it appears and
        disappears constantly while rearranging a board, and anything that
        reserves space would make the columns twitch on every drop.
      */}
      <div
        aria-live="polite"
        className={cn(
          "bg-card fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border py-1.5 pr-4 pl-3 text-sm shadow-lg transition-all duration-200",
          savingMove
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
        role="status"
      >
        <Spinner className="size-3.5" />
        <span className="text-muted-foreground">Saving…</span>
      </div>
    </DndContext>
  );
}

function Column({
  cards,
  id,
  label,
}: {
  cards: CardView[];
  id: BoardColumn;
  label: string;
}) {
  // Droppable on the column itself, so a card can be dropped into an empty one.
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className={cn("size-2 rounded-full", COLUMN_ACCENT[id])}
        />
        {label}
        <span className="bg-muted text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums">
          {cards.length}
        </span>
      </h2>

      <div
        className={cn(
          "bg-muted/40 flex min-h-40 flex-col gap-2 rounded-xl border border-transparent p-2 transition-colors",
          isOver && "border-primary/50 bg-accent/40",
        )}
        ref={setNodeRef}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard card={card} key={card.id} />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <p className="text-muted-foreground/70 flex flex-1 items-center justify-center py-6 text-center text-xs">
            Drop a card here
          </p>
        )}
      </div>
    </section>
  );
}

function SortableCard({ card }: { card: CardView }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  return (
    <div
      className={isDragging ? "opacity-40" : undefined}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <CardShell
        // Only the card body is the drag handle — the delete button beside it
        // stays clickable.
        dragProps={{ ...attributes, ...listeners }}
        id={card.id}
        title={card.title}
      />
    </div>
  );
}

/**
 * The delete control. It reads its own form's status rather than taking a
 * pending prop, so each card reports independently — deleting one card must
 * not make every other card's button look busy.
 */
function DeleteCardButton({ title }: { title: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-label={pending ? `Deleting "${title}"` : `Delete "${title}"`}
      className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-disabled:opacity-100"
      disabled={pending}
      size="icon-xs"
      type="submit"
      variant="ghost"
    >
      {pending ? <Spinner className="size-3" /> : <XIcon />}
    </Button>
  );
}

function CardShell({
  dragging,
  dragProps,
  id,
  title,
}: {
  dragging?: boolean;
  dragProps?: Record<string, unknown>;
  id?: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "bg-card group flex items-start gap-1.5 rounded-lg border p-2.5 shadow-xs transition-shadow",
        dragging ? "shadow-lg" : "hover:shadow-sm",
      )}
    >
      <span
        aria-hidden
        className="text-muted-foreground/40 mt-0.5 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVerticalIcon className="size-3.5" />
      </span>

      <span className="flex-1 cursor-grab text-sm leading-snug" {...dragProps}>
        {title}
      </span>

      {id && (
        <form action={deleteCard}>
          <input name="id" type="hidden" value={id} />
          <DeleteCardButton title={title} />
        </form>
      )}
    </div>
  );
}

function AddCardForm() {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await createCard(formData);
          setTitle("");
        })
      }
      className="flex max-w-lg gap-2"
    >
      <Input
        aria-label="Add a card to To Do"
        disabled={pending}
        name="title"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a card to To Do…"
        value={title}
      />
      <Button disabled={pending || title.trim() === ""} type="submit">
        {pending ? <Spinner className="size-3.5" /> : <PlusIcon />}
        Add
      </Button>
    </form>
  );
}
