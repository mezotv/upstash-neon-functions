import Board from "@/components/Board";
import NewTicketDialog from "@/components/NewTicketDialog";
import ReviewQueue from "@/components/ReviewQueue";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  OPEN_TICKET_STATUSES,
  PRIORITY_META,
  STATUS_META,
} from "@/constants/board";
import { DEMO_TICKETS } from "@/constants/demo-tickets";
import { listTicketsFromTicketApi } from "@/lib/ticket-api";
import { listTickets } from "@/lib/tickets";
import type { BoardTicket } from "@/types/board";
import type { TicketStatus } from "@/types/ticket";
import { timeAgo } from "@/utils/time-ago";
import { toBoardTicket } from "@/utils/to-board-ticket";

export const dynamic = "force-dynamic";

async function loadBoard(): Promise<{ tickets: BoardTicket[]; demo: boolean }> {
  try {
    const tickets = (await listTicketsFromTicketApi()) ?? (await listTickets());
    if (tickets.length === 0) {
      return { tickets: DEMO_TICKETS, demo: true };
    }
    return { tickets: tickets.map(toBoardTicket), demo: false };
  } catch {
    return { tickets: DEMO_TICKETS, demo: true };
  }
}

export default async function Home() {
  const { tickets, demo } = await loadBoard();

  const countBy = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status).length;

  const open = tickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(t.status),
  ).length;
  const needsReview = countBy("waiting_for_approval");

  const reviewTickets = tickets.filter(
    (t) => t.status === "waiting_for_approval",
  );
  const activity = [...tickets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  const metrics = [
    { label: "Open tickets", value: open, detail: `${countBy("received")} new` },
    {
      label: "Needs review",
      value: needsReview,
      detail: "awaiting a human",
    },
    { label: "Resolved", value: countBy("resolved"), detail: "replies sent" },
    {
      label: "Escalated",
      value: countBy("escalated"),
      detail: "handed off",
    },
  ];

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Operations board
              </h1>
              {demo && (
                <span className="text-xs text-muted-foreground">
                  Showing sample data
                </span>
              )}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Track tickets through intake, triage, review, resolution, and
              escalation. Drag a card to move it between columns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NewTicketDialog />
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="gap-1 py-4">
              <div className="px-4">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {metric.detail}
                </p>
              </div>
            </Card>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Ticket queue</h2>
            <p className="text-sm text-muted-foreground">
              {tickets.length} tickets
            </p>
          </div>
          <Board tickets={tickets} persist={!demo} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Review queue</h2>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {reviewTickets.length}
              </span>
            </div>
            <ReviewQueue tickets={reviewTickets} persist={!demo} />
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border bg-card">
                {activity.map((ticket) => {
                  const status = STATUS_META[ticket.status];
                  const priority = PRIORITY_META[ticket.priority];

                  return (
                    <li
                      key={ticket.id}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-snug">
                          {ticket.subject}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ticket.customerEmail}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={priority.className}
                          >
                            {priority.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {status.name}
                          </span>
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {timeAgo(ticket.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
