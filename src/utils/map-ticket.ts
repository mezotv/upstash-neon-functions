import type { Ticket, TicketRow } from "@/types/ticket";

export function mapTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    subject: row.subject,
    body: row.body,
    priority: row.priority,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    approvalEventId: row.approval_event_id,
    classification: row.classification,
    draftResponse: row.draft_response,
    resolution: row.resolution,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
