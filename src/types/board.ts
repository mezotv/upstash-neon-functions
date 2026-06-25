import type { TicketInput, TicketStatus } from "@/types/ticket";

export type BoardTicket = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketInput["priority"];
  customerEmail: string;
  createdAt: string;
  summary: string | null;
};

export type BoardColumn = {
  id: TicketStatus;
  name: string;
  color: string;
  description: string;
};

export type StatusMeta = {
  name: string;
  color: string;
};

export type PriorityMeta = {
  label: string;
  className: string;
};

export type BoardFeature = BoardTicket & {
  name: string;
  column: TicketStatus;
};
