import type { TicketInput } from "@/types/ticket";

export const TICKET_COLUMNS = `
  id,
  customer_email,
  subject,
  body,
  priority,
  status,
  workflow_run_id,
  approval_event_id,
  classification,
  draft_response,
  resolution,
  created_at,
  updated_at
`;

export const TICKET_FIELD_NAMES = [
  "customerEmail",
  "subject",
  "body",
  "priority",
] satisfies (keyof TicketInput)[];

export const TICKET_PRIORITIES = [
  { value: "low", label: "Low", hint: "FYI / no rush" },
  { value: "normal", label: "Normal", hint: "Standard SLA" },
  { value: "high", label: "High", hint: "Customer blocked" },
  { value: "urgent", label: "Urgent", hint: "Outage / churn risk" },
] satisfies {
  value: TicketInput["priority"];
  label: string;
  hint: string;
}[];
