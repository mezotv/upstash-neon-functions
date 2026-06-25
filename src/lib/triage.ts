import {
  BILLING_TERMS,
  NEGATIVE_TERMS,
  TECHNICAL_TERMS,
  URGENT_TERMS,
} from "@/constants/triage";
import type { TicketClassification, TicketDraft } from "@/types/ticket";
import type { TriageInput } from "@/types/triage";

function includesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function classifyTicket(ticket: TriageInput): TicketClassification {
  const text = `${ticket.subject}\n${ticket.body}`;
  const isUrgent = ticket.priority === "urgent" || includesAny(text, URGENT_TERMS);
  const isBilling = includesAny(text, BILLING_TERMS);
  const isTechnical = includesAny(text, TECHNICAL_TERMS);
  const sentiment = includesAny(text, NEGATIVE_TERMS) ? "negative" : "neutral";

  return {
    category: isBilling ? "billing" : isTechnical ? "technical" : "general",
    sentiment,
    confidence: isBilling || isTechnical || isUrgent ? 0.78 : 0.58,
    needsHumanApproval: isUrgent || sentiment === "negative",
    summary: isUrgent
      ? "Customer appears blocked and needs fast human attention."
      : "Ticket can likely be answered with a standard support response.",
  };
}

export function draftTicketResponse(
  ticket: TriageInput,
  classification: TicketClassification,
): TicketDraft {
  const response = [
    `Hi, thanks for reaching out about "${ticket.subject}".`,
    "",
    `I categorized this as ${classification.category} and summarized it as: ${classification.summary}`,
    "",
    classification.needsHumanApproval
      ? "I am routing this to a teammate for review before sending a final reply."
      : "Here is the recommended next step: we will review the account details and follow up with a concrete resolution shortly.",
    "",
    "Thanks for your patience.",
  ].join("\n");

  return {
    response,
    nextAction: classification.needsHumanApproval ? "approve" : "send",
  };
}
