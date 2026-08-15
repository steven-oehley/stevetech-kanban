import { BoardColumn } from "@/generated/prisma/enums";

/** The three fixed columns, in board order. */
export const COLUMNS = [
  { id: BoardColumn.TODO, label: "To Do" },
  { id: BoardColumn.DOING, label: "Doing" },
  { id: BoardColumn.DONE, label: "Done" },
] as const;

export type CardView = {
  id: string;
  title: string;
  column: BoardColumn;
  order: number;
};

const COLUMN_IDS = new Set<string>(COLUMNS.map((column) => column.id));

/** Narrows an untrusted string — drop targets arrive from the browser. */
export function toBoardColumn(value: unknown): BoardColumn | null {
  return typeof value === "string" && COLUMN_IDS.has(value)
    ? (value as BoardColumn)
    : null;
}

export { BoardColumn };
