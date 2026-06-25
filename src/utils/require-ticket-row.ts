import type { TicketRow } from "@/types/ticket";

export function requireTicketRow(row: TicketRow | undefined): TicketRow {
  if (!row) {
    throw new Error("Expected the ticket query to return a row.");
  }

  return row;
}
