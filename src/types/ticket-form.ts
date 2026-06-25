import type { TicketInput } from "@/types/ticket";

export type TicketFieldErrors = Partial<Record<keyof TicketInput, string>>;

export type TicketSubmitResult = {
  ticketId: string | null;
  workflowRunId: string | null;
};
