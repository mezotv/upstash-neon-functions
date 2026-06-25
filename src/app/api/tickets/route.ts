import { Client } from "@upstash/workflow";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createTicket,
  listTickets,
  markTicketWorkflowStarted,
  updateTicketStatus,
} from "@/lib/tickets";
import { isAuthorizedRequest, unauthorized } from "@/lib/api-auth";
import { getAppBaseUrl } from "@/lib/url";
import { ticketInputSchema, ticketStatusSchema } from "@/schemas/ticket";

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorized();
  }

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
  if (!isAuthorizedRequest(request)) {
    return unauthorized();
  }

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
  if (!isAuthorizedRequest(request)) {
    return unauthorized();
  }

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
  const qstashToken = process.env.QSTASH_TOKEN;

  if (!qstashToken) {
    return NextResponse.json(
      {
        ticket,
        setupRequired:
          "Ticket saved. Add QSTASH_TOKEN to trigger the Upstash Workflow.",
      },
      { status: 202 },
    );
  }

  const client = new Client({ token: qstashToken });
  const workflowUrl = new URL(
    "/api/workflows/ticket-triage",
    getAppBaseUrl(request),
  ).toString();

  try {
    const { workflowRunId } = await client.trigger({
      url: workflowUrl,
      body: { ticketId: ticket.id },
      workflowRunId: `ticket-${ticket.id}`,
      retries: 3,
      label: ["support-triage", ticket.priority],
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
        ticket,
        warning: `Ticket saved, but the triage workflow could not be started (${detail}). Check QSTASH_TOKEN and that APP_URL is a public, non-loopback URL.`,
      },
      { status: 202 },
    );
  }
}
