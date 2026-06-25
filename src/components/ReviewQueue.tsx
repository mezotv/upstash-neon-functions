"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TICKET_API_URL, ticketApiHeaders } from "@/constants/api";
import { PRIORITY_META } from "@/constants/board";
import type { BoardTicket } from "@/types/board";
import type { ReviewQueueRowState } from "@/types/review-queue";
import { isRecord } from "@/utils/is-record";
import { timeAgo } from "@/utils/time-ago";

export default function ReviewQueue({
  tickets,
  persist,
}: {
  tickets: BoardTicket[];
  persist: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, ReviewQueueRowState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  async function decide(id: string, approved: boolean) {
    setState((prev) => ({ ...prev, [id]: approved ? "approving" : "escalating" }));
    setErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      const response = await fetch(TICKET_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ticketApiHeaders },
        body: JSON.stringify({
          ticketId: id,
          approved,
          note: approved ? undefined : "Escalated by reviewer",
        }),
      });

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const data = await response.json();
          if (isRecord(data) && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // keep the default message
        }
        throw new Error(message);
      }

      setState((prev) => ({ ...prev, [id]: "idle" }));
      setCompletedIds((prev) => [...prev, id]);
      router.refresh();
    } catch (err) {
      setState((prev) => ({ ...prev, [id]: "error" }));
      setErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }

  const visibleTickets = tickets.filter(
    (ticket) => !completedIds.includes(ticket.id),
  );

  if (visibleTickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is waiting for review.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {visibleTickets.map((ticket) => {
        const priority = PRIORITY_META[ticket.priority];
        const rowState = state[ticket.id] ?? "idle";
        const busy = rowState === "approving" || rowState === "escalating";
        const classification = ticket.classification;

        return (
          <li key={ticket.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className={priority.className}>
                {priority.label}
              </Badge>
              <span
                className="text-xs text-muted-foreground"
                suppressHydrationWarning
              >
                {timeAgo(ticket.createdAt)}
              </span>
            </div>

            <p className="mt-2 text-sm font-medium leading-snug">
              {ticket.subject}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {ticket.customerEmail}
            </p>
            {ticket.summary && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {ticket.summary}
              </p>
            )}

            {classification && (
              <div className="mt-3 grid gap-2 rounded-md border bg-muted/40 p-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-background px-2 py-1">
                    Category: {classification.category}
                  </span>
                  <span className="rounded bg-background px-2 py-1">
                    Sentiment: {classification.sentiment}
                  </span>
                  <span className="rounded bg-background px-2 py-1">
                    Confidence: {Math.round(classification.confidence * 100)}%
                  </span>
                </div>
                <p className="text-muted-foreground">{classification.summary}</p>
              </div>
            )}

            {ticket.draftResponse && (
              <div className="mt-3 rounded-md border bg-background p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Draft reply to approve
                </p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">
                  {ticket.draftResponse}
                </p>
              </div>
            )}

            {persist && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => decide(ticket.id, true)}
                  disabled={busy}
                >
                  {rowState === "approving" && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Approve and resolve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decide(ticket.id, false)}
                  disabled={busy}
                >
                  {rowState === "escalating" && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Escalate
                </Button>
              </div>
            )}

            {rowState === "error" && errors[ticket.id] && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {errors[ticket.id]}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
