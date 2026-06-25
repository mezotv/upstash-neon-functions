import { z } from "zod";

import { ticketPrioritySchema } from "@/schemas/ticket";

export const triageInputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  priority: ticketPrioritySchema,
});
