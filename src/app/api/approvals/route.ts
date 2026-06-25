import { Client } from "@upstash/workflow";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getTicket } from "@/lib/tickets";

const approvalSchema = z.object({
  ticketId: z.string().uuid(),
  approved: z.boolean(),
  note: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const payload = approvalSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        error: "Invalid approval payload.",
        issues: payload.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const qstashToken = process.env.QSTASH_TOKEN;

  if (!qstashToken) {
    return NextResponse.json(
      { error: "QSTASH_TOKEN is required to notify waiting workflows." },
      { status: 500 },
    );
  }

  const ticket = await getTicket(payload.data.ticketId);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (ticket.status !== "waiting_for_approval" || !ticket.approvalEventId) {
    return NextResponse.json(
      { error: "Ticket is not awaiting approval." },
      { status: 409 },
    );
  }

  const client = new Client({ token: qstashToken });
  const notified = await client.notify({
    eventId: ticket.approvalEventId,
    eventData: {
      approved: payload.data.approved,
      note: payload.data.note,
    },
    workflowRunId: ticket.workflowRunId ?? undefined,
  });

  return NextResponse.json({
    eventId: ticket.approvalEventId,
    notified,
  });
}
