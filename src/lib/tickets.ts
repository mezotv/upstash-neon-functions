import { TICKET_COLUMNS } from "@/constants/ticket";
import { getSql } from "@/lib/db";
import { ticketRowSchema } from "@/schemas/ticket";
import type {
  TicketClassification,
  TicketDraft,
  TicketInput,
  TicketPriority,
  TicketStatus,
} from "@/types/ticket";
import { mapTicket } from "@/utils/map-ticket";
import { requireTicketRow } from "@/utils/require-ticket-row";

const ticketRowsSchema = ticketRowSchema.array();

export async function createTicket(input: TicketInput) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    insert into support_tickets (
      customer_email,
      subject,
      body,
      priority
    ) values (
      ${input.customerEmail},
      ${input.subject},
      ${input.body},
      ${input.priority}
    )
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return mapTicket(requireTicketRow(row));
}

export async function listTickets(limit = 200) {
  const sql = getSql();
  const rows = ticketRowsSchema.parse(await sql`
    select ${sql.unsafe(TICKET_COLUMNS)}
    from support_tickets
    order by created_at desc
    limit ${limit}
  `);

  return rows.map(mapTicket);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    update support_tickets
    set
      status = ${status},
      updated_at = now()
    where id = ${ticketId}
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return row ? mapTicket(row) : null;
}

export async function getTicket(ticketId: string) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    select ${sql.unsafe(TICKET_COLUMNS)}
    from support_tickets
    where id = ${ticketId}
  `);

  return row ? mapTicket(row) : null;
}

export async function markTicketWorkflowStarted(
  ticketId: string,
  workflowRunId: string,
) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    update support_tickets
    set
      workflow_run_id = ${workflowRunId},
      status = 'triaging',
      updated_at = now()
    where id = ${ticketId}
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return mapTicket(requireTicketRow(row));
}

export async function saveTicketClassification(
  ticketId: string,
  classification: TicketClassification,
  priority?: TicketPriority,
) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    update support_tickets
    set
      classification = ${JSON.stringify(classification)}::jsonb,
      priority = coalesce(${priority ?? null}, priority),
      status = 'drafted',
      updated_at = now()
    where id = ${ticketId}
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return mapTicket(requireTicketRow(row));
}

export async function saveTicketDraft(
  ticketId: string,
  draft: TicketDraft,
  status: Extract<TicketStatus, "drafted" | "waiting_for_approval">,
) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    update support_tickets
    set
      draft_response = ${draft.response},
      status = ${status},
      updated_at = now()
    where id = ${ticketId}
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return mapTicket(requireTicketRow(row));
}

export async function markTicketWaitingForApproval(
  ticketId: string,
  approvalEventId: string,
) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    update support_tickets
    set
      approval_event_id = ${approvalEventId},
      status = 'waiting_for_approval',
      updated_at = now()
    where id = ${ticketId}
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return mapTicket(requireTicketRow(row));
}

export async function finishTicket(
  ticketId: string,
  status: Extract<TicketStatus, "resolved" | "escalated">,
  resolution: string,
) {
  const sql = getSql();
  const [row] = ticketRowsSchema.parse(await sql`
    update support_tickets
    set
      status = ${status},
      resolution = ${resolution},
      updated_at = now()
    where id = ${ticketId}
    returning ${sql.unsafe(TICKET_COLUMNS)}
  `);

  return mapTicket(requireTicketRow(row));
}
