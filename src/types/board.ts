import type {
  TicketClassification,
  TicketInput,
  TicketStatus,
} from "@/types/ticket";

export type BoardTicket = {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketInput["priority"];
  customerEmail: string;
  workflowRunId: string | null;
  approvalEventId: string | null;
  createdAt: string;
  summary: string | null;
  classification: TicketClassification | null;
  draftResponse: string | null;
  resolution: string | null;
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
