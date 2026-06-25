import type { z } from "zod";

import type { triageInputSchema } from "@/schemas/triage";

export type TriageInput = z.infer<typeof triageInputSchema>;
