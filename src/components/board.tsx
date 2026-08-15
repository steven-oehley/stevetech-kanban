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
import { useState, useTransition } from "react";

import { createCard, deleteCard, moveCard } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLUMNS, type BoardColumn, type CardView } from "@/lib/board";

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

export function Board({ cards }: { cards: CardView[] }) {
  const [lists, setLists] = useState<Lists>(() => groupByColumn(cards));
  const [activeId, setActiveId] = useState<string | null>(null);

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

    void moveCard({
      cardId,
      column: to,
      orderedIds: target.map((entry) => entry.id),
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
      <div className="grid gap-4 sm:grid-cols-3">
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
        {activeCard ? <CardShell title={activeCard.title} /> : null}
      </DragOverlay>
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
      <h2 className="text-muted-foreground text-sm font-medium">
        {label}
        <span className="ml-2 tabular-nums">{cards.length}</span>
      </h2>

      {id === "TODO" && <AddCardForm />}

      <div
        className={`bg-muted/40 flex min-h-32 flex-col gap-2 rounded-lg p-2 ${
          isOver ? "ring-ring ring-2" : ""
        }`}
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

function CardShell({
  dragProps,
  id,
  title,
}: {
  dragProps?: Record<string, unknown>;
  id?: string;
  title: string;
}) {
  return (
    <div className="bg-background flex items-start gap-2 rounded-md border p-2 shadow-xs">
      <span className="flex-1 cursor-grab text-sm" {...dragProps}>
        {title}
      </span>

      {id && (
        <form action={deleteCard}>
          <input name="id" type="hidden" value={id} />
          <Button
            aria-label={`Delete "${title}"`}
            className="h-6 px-2 text-xs"
            type="submit"
            variant="ghost"
          >
            ✕
          </Button>
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
      className="flex gap-2"
    >
      <Input
        aria-label="Add a card"
        name="title"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a card…"
        value={title}
      />
      <Button disabled={pending || title.trim() === ""} type="submit">
        Add
      </Button>
    </form>
  );
}
