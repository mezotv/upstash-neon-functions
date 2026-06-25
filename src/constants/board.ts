import type { BoardColumn, PriorityMeta, StatusMeta } from "@/types/board";
import type { TicketInput, TicketStatus } from "@/types/ticket";

export const BOARD_COLUMNS: BoardColumn[] = [
  {
    id: "received",
    name: "New",
    color: "#64748b",
    description: "Waiting for triage",
  },
  {
    id: "triaging",
    name: "Triaging",
    color: "#f59e0b",
    description: "Being classified",
  },
  {
    id: "drafted",
    name: "Drafted",
    color: "#3b82f6",
    description: "Reply prepared",
  },
  {
    id: "waiting_for_approval",
    name: "Needs review",
    color: "#a855f7",
    description: "Awaiting a human",
  },
  {
    id: "resolved",
    name: "Resolved",
    color: "#10b981",
    description: "Reply sent",
  },
  {
    id: "escalated",
    name: "Escalated",
    color: "#ef4444",
    description: "Handed off",
  },
];

export const STATUS_META: Record<TicketStatus, StatusMeta> = {
  received: { name: "New", color: "#64748b" },
  triaging: { name: "Triaging", color: "#f59e0b" },
  drafted: { name: "Drafted", color: "#3b82f6" },
  waiting_for_approval: { name: "Needs review", color: "#a855f7" },
  resolved: { name: "Resolved", color: "#10b981" },
  escalated: { name: "Escalated", color: "#ef4444" },
};

export const PRIORITY_META: Record<TicketInput["priority"], PriorityMeta> = {
  low: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  normal: {
    label: "Normal",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  high: {
    label: "High",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "received",
  "triaging",
  "drafted",
  "waiting_for_approval",
];
