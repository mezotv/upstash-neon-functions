import { serve } from "@upstash/workflow/nextjs";

import { callTriageFunction } from "@/lib/triage-function";
import {
  finishTicket,
  getTicket,
  markTicketWaitingForApproval,
} from "@/lib/tickets";
import type { ApprovalDecision } from "@/types/ticket";
import type { TicketTriagePayload } from "@/types/workflow";

export const runtime = "nodejs";

const { POST: handleWorkflowCallback } = serve<TicketTriagePayload>(
  async (context) => {
    const { ticketId } = context.requestPayload;

    const ticket = await context.run("load ticket from neon", async () => {
      const existingTicket = await getTicket(ticketId);

      if (!existingTicket) {
        throw new Error(`Ticket ${ticketId} was not found.`);
      }

      return existingTicket;
    });

    const triagedTicket = await context.run("triage with neon ai function", async () => {
      await callTriageFunction(ticket.id);

      const updatedTicket = await getTicket(ticket.id);
      if (!updatedTicket) {
        throw new Error(`Ticket ${ticket.id} disappeared during triage.`);
      }

      return updatedTicket;
    });

    if (!triagedTicket.classification?.needsHumanApproval) {
      return triagedTicket;
    }

    const approvalEventId = `ticket:${ticket.id}:approval`;

    await context.run("record approval waiter", async () => {
      await markTicketWaitingForApproval(ticket.id, approvalEventId);
    });

    const approval = await context.waitForEvent<ApprovalDecision>(
      "wait for human approval",
      approvalEventId,
      { timeout: "3d" },
    );

    if (approval.timeout) {
      return await context.run("escalate approval timeout", async () => {
        return finishTicket(
          ticket.id,
          "escalated",
          "Approval timed out after 3 days.",
        );
      });
    }

    return await context.run("apply approval decision", async () => {
      if (!approval.eventData.approved) {
        return finishTicket(
          ticket.id,
          "escalated",
          approval.eventData.note ?? "Reviewer requested escalation.",
        );
      }

      return finishTicket(
        ticket.id,
        "resolved",
        approval.eventData.note
          ? `${triagedTicket.draftResponse ?? "Approved reply."}\n\nReviewer note: ${approval.eventData.note}`
          : triagedTicket.draftResponse ?? "Approved reply.",
      );
    });
  },
);

export async function POST(request: Request) {
  const signingKeysConfigured =
    Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY) &&
    Boolean(process.env.QSTASH_NEXT_SIGNING_KEY);

  if (process.env.NODE_ENV === "production" && !signingKeysConfigured) {
    return new Response(
      JSON.stringify({ error: "QStash signing keys are not configured." }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  return handleWorkflowCallback(request);
}
