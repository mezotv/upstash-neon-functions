import { z } from "zod";

import {
  ticketClassificationSchema,
  ticketDraftSchema,
  ticketPrioritySchema,
} from "@/schemas/ticket";

export const aiTriageOutputSchema = z.object({
  priority: ticketPrioritySchema,
  classification: ticketClassificationSchema.extend({
    confidence: z.number().min(0).max(1),
  }),
  draft: ticketDraftSchema,
});
