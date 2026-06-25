import { NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorized } from "@/lib/api-auth";
import { getTicket, updateTicketStatus } from "@/lib/tickets";
import { callTriageFunction, TriageFunctionError } from "@/lib/triage-function";
import { ticketTriageRequestSchema } from "@/schemas/ticket";

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return unauthorized();
  }

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
