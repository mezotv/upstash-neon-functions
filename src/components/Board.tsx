"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/kanban";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TICKET_API_URL,
  TICKET_TRIAGE_API_URL,
  ticketApiHeaders,
} from "@/constants/api";
import { BOARD_COLUMNS, PRIORITY_META, STATUS_META } from "@/constants/board";
import type { BoardFeature, BoardTicket } from "@/types/board";
import type { TicketStatus } from "@/types/ticket";
import { timeAgo } from "@/utils/time-ago";

function toFeature(ticket: BoardTicket): BoardFeature {
  return { ...ticket, name: ticket.subject, column: ticket.status };
}

export default function Board({
  tickets,
  persist,
}: {
  tickets: BoardTicket[];
  persist: boolean;
}) {
  const router = useRouter();
  const [features, setFeatures] = useState<BoardFeature[]>(() =>
    tickets.map(toFeature),
  );
  const featuresRef = useRef(features);
  const serverColumns = useRef<Record<string, TicketStatus>>(
    Object.fromEntries(tickets.map((t) => [t.id, t.status])),
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [triagingTicketId, setTriagingTicketId] = useState<string | null>(null);

  const signature = tickets.map((t) => `${t.id}:${t.status}`).join("|");
  const [syncedSignature, setSyncedSignature] = useState(signature);
  const selectedTicket =
    features.find((feature) => feature.id === selectedTicketId) ?? null;

  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    setFeatures(tickets.map(toFeature));
  }

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  useEffect(() => {
    serverColumns.current = Object.fromEntries(
      tickets.map((t) => [t.id, t.status]),
    );
  }, [tickets]);

  const handleDataChange = (next: BoardFeature[]) => {
    featuresRef.current = next;
    setFeatures(next);
  };

  async function persistMoves() {
    if (!persist) return;

    const moved = featuresRef.current.filter(
      (feature) => serverColumns.current[feature.id] !== feature.column,
    );

    for (const feature of moved) {
      const previous = serverColumns.current[feature.id];
      serverColumns.current[feature.id] = feature.column;

      try {
        const response = await fetch(TICKET_API_URL, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...ticketApiHeaders },
          body: JSON.stringify({ id: feature.id, status: feature.column }),
        });
        if (!response.ok) throw new Error("Request failed");
        setError(null);
        router.refresh();
      } catch {
        serverColumns.current[feature.id] = previous;
        setFeatures((prev) =>
          prev.map((item) =>
            item.id === feature.id ? { ...item, column: previous } : item,
          ),
        );
        featuresRef.current = featuresRef.current.map((item) =>
          item.id === feature.id ? { ...item, column: previous } : item,
        );
        setError(`Could not move "${feature.subject}". Change reverted.`);
      }
    }
  }

  async function runTriage(ticket: BoardFeature) {
    setTriagingTicketId(ticket.id);

    try {
      const response = await fetch(TICKET_TRIAGE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ticketApiHeaders },
        body: JSON.stringify({ ticketId: ticket.id }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body && typeof body.error === "string"
            ? body.error
            : "AI triage failed.",
        );
      }

      setError(null);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : `Could not triage "${ticket.subject}".`,
      );
    } finally {
      setTriagingTicketId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <KanbanProvider
        columns={BOARD_COLUMNS}
        data={features}
        onDataChange={handleDataChange}
        onDragEnd={() => {
          void persistMoves();
        }}
        className="items-start"
      >
        {(column) => {
          const count = features.filter((f) => f.column === column.id).length;

          return (
            <KanbanBoard id={column.id} key={column.id} className="bg-secondary/60">
              <KanbanHeader className="flex flex-col gap-0.5 bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-semibold">{column.name}</span>
                  </div>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {count}
                  </span>
                </div>
                <span className="pl-4 text-xs font-normal text-muted-foreground">
                  {column.description}
                </span>
              </KanbanHeader>

              <KanbanCards id={column.id} empty="No tickets">

                {(feature: BoardFeature) => {
                  const priority = PRIORITY_META[feature.priority];

                  return (
                    <KanbanCard
                      column={feature.column}
                      id={feature.id}
                      key={feature.id}
                      name={feature.name}
                      className="gap-2"
                      onClick={() => setSelectedTicketId(feature.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className={priority.className}
                        >
                          {priority.label}
                        </Badge>
                        <span
                          className="text-xs text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {timeAgo(feature.createdAt)}
                        </span>
                      </div>
                      <p className="m-0 line-clamp-2 font-medium text-sm leading-snug">
                        {feature.subject}
                      </p>
                      <p className="m-0 truncate text-xs text-muted-foreground">
                        {feature.customerEmail}
                      </p>
                      {feature.summary && (
                        <p className="m-0 line-clamp-2 text-xs text-muted-foreground">
                          {feature.summary}
                        </p>
                      )}
                    </KanbanCard>
                  );
                }}
              </KanbanCards>
            </KanbanBoard>
          );
        }}
      </KanbanProvider>

      <Dialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => {
          if (!open) setSelectedTicketId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <Badge
                    variant="secondary"
                    className={PRIORITY_META[selectedTicket.priority].className}
                  >
                    {PRIORITY_META[selectedTicket.priority].label}
                  </Badge>
                  <Badge variant="outline">
                    {STATUS_META[selectedTicket.status].name}
                  </Badge>
                </div>
                <DialogTitle className="leading-snug">
                  {selectedTicket.subject}
                </DialogTitle>
                <DialogDescription>
                  {selectedTicket.customerEmail}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    void runTriage(selectedTicket);
                  }}
                  disabled={triagingTicketId === selectedTicket.id}
                >
                  {triagingTicketId === selectedTicket.id
                    ? "Running AI triage..."
                    : "Run AI triage"}
                </Button>
                <p className="m-0 text-xs text-muted-foreground">
                  Dragging cards only changes status. This button is the only
                  action that reclassifies severity and drafts.
                </p>
              </div>

              <section className="grid gap-2">
                <h3 className="font-medium text-sm">Customer message</h3>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                  {selectedTicket.body}
                </p>
              </section>

              {selectedTicket.classification && (
                <section className="grid gap-2">
                  <h3 className="font-medium text-sm">AI classification</h3>
                  <div className="grid gap-2 rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">
                        Category: {selectedTicket.classification.category}
                      </Badge>
                      <Badge variant="secondary">
                        Sentiment: {selectedTicket.classification.sentiment}
                      </Badge>
                      <Badge variant="secondary">
                        Confidence:{" "}
                        {Math.round(selectedTicket.classification.confidence * 100)}
                        %
                      </Badge>
                    </div>
                    <p className="m-0 text-muted-foreground">
                      {selectedTicket.classification.summary}
                    </p>
                  </div>
                </section>
              )}

              {selectedTicket.draftResponse && (
                <section className="grid gap-2">
                  <h3 className="font-medium text-sm">Draft response</h3>
                  <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                    {selectedTicket.draftResponse}
                  </p>
                </section>
              )}

              {selectedTicket.resolution && (
                <section className="grid gap-2">
                  <h3 className="font-medium text-sm">Resolution</h3>
                  <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                    {selectedTicket.resolution}
                  </p>
                </section>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
