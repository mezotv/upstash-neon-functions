import { z } from "zod";

export const ticketPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const ticketInputSchema = z.object({
  customerEmail: z.email("Enter a valid customer email address."),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters.")
    .max(160, "Keep the subject under 160 characters."),
  body: z
    .string()
    .min(10, "Add at least 10 characters of detail.")
    .max(5000, "Message must be under 5000 characters."),
  priority: ticketPrioritySchema.default("normal"),
});

export const ticketStatusSchema = z.enum([
  "received",
  "triaging",
  "drafted",
  "waiting_for_approval",
  "resolved",
  "escalated",
]);

export const ticketClassificationSchema = z.object({
  category: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number(),
  needsHumanApproval: z.boolean(),
  summary: z.string(),
});

export const ticketDraftSchema = z.object({
  response: z.string(),
  nextAction: z.enum(["send", "approve", "escalate"]),
});

export const ticketTriageRequestSchema = z
  .union([
    z.object({ id: z.string().uuid() }),
    z.object({ ticketId: z.string().uuid() }),
  ])
  .transform((input) => ({
    id: "id" in input ? input.id : input.ticketId,
  }));

export const approvalDecisionSchema = z.object({
  approved: z.boolean(),
  note: z.string().optional(),
});

export const approvalRequestSchema = z.object({
  ticketId: z.string().uuid(),
  approved: z.boolean(),
  note: z.string().max(1000).optional(),
});

export const ticketRowSchema = z.object({
  id: z.string(),
  customer_email: z.string(),
  subject: z.string(),
  body: z.string(),
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  workflow_run_id: z.string().nullable(),
  approval_event_id: z.string().nullable(),
  classification: ticketClassificationSchema.nullable(),
  draft_response: z.string().nullable(),
  resolution: z.string().nullable(),
  created_at: z.union([z.date(), z.string()]),
  updated_at: z.union([z.date(), z.string()]),
});

export const ticketSchema = z.object({
  id: z.string(),
  customerEmail: z.string(),
  subject: z.string(),
  body: z.string(),
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  workflowRunId: z.string().nullable(),
  approvalEventId: z.string().nullable(),
  classification: ticketClassificationSchema.nullable(),
  draftResponse: z.string().nullable(),
  resolution: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ticketsResponseSchema = z.object({
  tickets: ticketSchema.array(),
});
