import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createTicket,
  getTicket,
  listTickets,
  markTicketWorkflowStarted,
  updateTicketStatus,
} from "@/lib/tickets";
import {
  callTriageFunction,
  isTriageFunctionConfigured,
  TriageFunctionError,
} from "@/lib/triage-function";
import {
  isTicketWorkflowConfigured,
  startTicketTriageWorkflow,
} from "@/lib/ticket-workflow";
import { ticketInputSchema, ticketStatusSchema } from "@/schemas/ticket";

export async function GET() {
  try {
    const tickets = await listTickets();
    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json(
      { tickets: [], error: "Could not load tickets." },
      { status: 200 },
    );
  }
}

const statusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: ticketStatusSchema,
});

export async function PATCH(request: Request) {
  const payload = statusUpdateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        error: "Invalid status update.",
        issues: payload.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const ticket = await updateTicketStatus(payload.data.id, payload.data.status);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function POST(request: Request) {
  const payload = ticketInputSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        error: "Invalid ticket payload.",
        issues: payload.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const ticket = await createTicket(payload.data);

  if (isTicketWorkflowConfigured()) {
    const triagingTicket = await updateTicketStatus(ticket.id, "triaging");

    try {
      const { workflowRunId } = await startTicketTriageWorkflow(request, {
        ticketId: ticket.id,
        priority: ticket.priority,
      });
      const updatedTicket = await markTicketWorkflowStarted(
        ticket.id,
        workflowRunId,
      );

      return NextResponse.json(
        { ticket: updatedTicket, workflowRunId },
        { status: 201 },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";

      return NextResponse.json(
        {
          ticket: triagingTicket ?? ticket,
          warning: `Ticket saved, but the Upstash Workflow could not be started (${detail}).`,
        },
        { status: 202 },
      );
    }
  }

  if (isTriageFunctionConfigured()) {
    const triagingTicket = await updateTicketStatus(ticket.id, "triaging");

    try {
      const triage = await callTriageFunction(ticket.id);
      const updatedTicket = await getTicket(ticket.id);

      return NextResponse.json(
        { ticket: updatedTicket ?? ticket, triage },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof TriageFunctionError) {
        return NextResponse.json(
          {
            ticket: triagingTicket ?? ticket,
            warning: error.message,
            detail: error.detail,
          },
          { status: 202 },
        );
      }

      return NextResponse.json(
        {
          ticket: triagingTicket ?? ticket,
          warning:
            error instanceof Error
              ? error.message
              : "Ticket saved, but triage could not be started.",
        },
        { status: 202 },
      );
    }
  }

  return NextResponse.json(
    {
      ticket,
      setupRequired:
        "Ticket saved. Add QSTASH_TOKEN or TRIAGE_FUNCTION_URL/TRIAGE_API_KEY to trigger triage.",
    },
    { status: 202 },
  );
}
