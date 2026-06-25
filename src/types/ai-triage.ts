import type {
  TicketClassification,
  TicketDraft,
  TicketPriority,
} from "@/types/ticket";

export type TicketTriageResult = {
  priority: TicketPriority;
  classification: TicketClassification;
  draft: TicketDraft;
};
