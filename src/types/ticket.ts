import type { z } from "zod";

import type {
  approvalDecisionSchema,
  ticketClassificationSchema,
  ticketDraftSchema,
  ticketInputSchema,
  ticketPrioritySchema,
  ticketSchema,
  ticketRowSchema,
  ticketStatusSchema,
} from "@/schemas/ticket";

export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketInput = z.infer<typeof ticketInputSchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketClassification = z.infer<typeof ticketClassificationSchema>;
export type TicketDraft = z.infer<typeof ticketDraftSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type TicketRow = z.infer<typeof ticketRowSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
