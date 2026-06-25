"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/ui/kanban";
import { BOARD_COLUMNS, PRIORITY_META } from "@/constants/board";
import { apiKeyHeader } from "@/lib/api-key";
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
  const [features, setFeatures] = useState<BoardFeature[]>(() =>
    tickets.map(toFeature),
  );
  const featuresRef = useRef(features);
  const serverColumns = useRef<Record<string, TicketStatus>>(
    Object.fromEntries(tickets.map((t) => [t.id, t.status])),
  );
  const [error, setError] = useState<string | null>(null);

  const signature = tickets.map((t) => `${t.id}:${t.status}`).join("|");
  const [syncedSignature, setSyncedSignature] = useState(signature);

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
        const response = await fetch("/api/tickets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...apiKeyHeader },
          body: JSON.stringify({ id: feature.id, status: feature.column }),
        });
        if (!response.ok) throw new Error("Request failed");
        setError(null);
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
    </div>
  );
}
