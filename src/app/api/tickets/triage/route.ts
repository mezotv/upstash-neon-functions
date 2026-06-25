import { NextResponse } from "next/server";

import {
  getTicket,
  markTicketWorkflowStarted,
  updateTicketStatus,
} from "@/lib/tickets";
import {
  isTicketWorkflowConfigured,
  startTicketTriageWorkflow,
} from "@/lib/ticket-workflow";
import { callTriageFunction, TriageFunctionError } from "@/lib/triage-function";
import { ticketTriageRequestSchema } from "@/schemas/ticket";

export async function POST(request: Request) {
  const payload = ticketTriageRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        error: "Invalid triage request.",
        issues: payload.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const ticket = await updateTicketStatus(payload.data.id, "triaging");
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (isTicketWorkflowConfigured()) {
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
        { status: 202 },
      );
    } catch (error) {
      return NextResponse.json(
        {
          ticket,
          error:
            error instanceof Error
              ? error.message
              : "Could not start Upstash Workflow.",
        },
        { status: 500 },
      );
    }
  }

  try {
    const result = await callTriageFunction(ticket.id);
    const updatedTicket = await getTicket(ticket.id);

    return NextResponse.json({
      ticket: updatedTicket ?? ticket,
      triage: result,
    });
  } catch (error) {
    if (error instanceof TriageFunctionError) {
      return NextResponse.json(
        {
          error: error.message,
          detail: error.detail,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Triage failed." },
      { status: 500 },
    );
  }
}
