import type { TicketSubmitResult } from "@/types/ticket-form";
import { isRecord } from "@/utils/is-record";

function pickString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
  }
  return null;
}

export function parseTicketSubmitResult(data: unknown): TicketSubmitResult {
  if (!isRecord(data)) {
    return { ticketId: null, workflowRunId: null };
  }

  const ticket = isRecord(data.ticket) ? data.ticket : null;

  return {
    ticketId: pickString(data.ticketId, data.id, ticket?.id, ticket?.ticketId),
    workflowRunId: pickString(
      data.workflowRunId,
      data.runId,
      data.workflowId,
      ticket?.workflowRunId,
    ),
  };
}
