import { serve } from "@upstash/workflow/nextjs";

import { draftTicketResponse, classifyTicket } from "@/lib/triage";
import {
  finishTicket,
  getTicket,
  markTicketWaitingForApproval,
  saveTicketClassification,
  saveTicketDraft,
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

    const classification = await context.run("classify ticket", async () => {
      const result = classifyTicket(ticket);
      await saveTicketClassification(ticket.id, result);

      return result;
    });

    const draft = await context.run("draft support reply", async () => {
      const result = draftTicketResponse(ticket, classification);
      await saveTicketDraft(
        ticket.id,
        result,
        classification.needsHumanApproval ? "waiting_for_approval" : "drafted",
      );

      return result;
    });

    if (!classification.needsHumanApproval) {
      return await context.run("auto resolve ticket", async () => {
        return finishTicket(ticket.id, "resolved", draft.response);
      });
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
          ? `${draft.response}\n\nReviewer note: ${approval.eventData.note}`
          : draft.response,
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
