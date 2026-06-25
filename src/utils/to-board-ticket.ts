import type { BoardTicket } from "@/types/board";
import type { Ticket } from "@/types/ticket";

export function toBoardTicket(ticket: Ticket): BoardTicket {
  return {
    id: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    status: ticket.status,
    priority: ticket.priority,
    customerEmail: ticket.customerEmail,
    workflowRunId: ticket.workflowRunId,
    approvalEventId: ticket.approvalEventId,
    createdAt: ticket.createdAt,
    summary:
      ticket.classification?.summary ??
      (ticket.body.length > 120 ? `${ticket.body.slice(0, 120)}...` : ticket.body),
    classification: ticket.classification,
    draftResponse: ticket.draftResponse,
    resolution: ticket.resolution,
  };
}
