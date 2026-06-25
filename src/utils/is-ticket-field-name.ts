import { TICKET_FIELD_NAMES } from "@/constants/ticket";
import type { TicketInput } from "@/types/ticket";

export function isTicketFieldName(value: unknown): value is keyof TicketInput {
  return (
    typeof value === "string" &&
    TICKET_FIELD_NAMES.some((fieldName) => fieldName === value)
  );
}
