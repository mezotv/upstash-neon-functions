import { timingSafeEqual } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { Hono } from "hono";

import {
  classifyTicket,
  draftTicketResponse,
} from "../src/lib/triage";
import { triageInputSchema } from "../src/schemas/triage";

const sql = neon(process.env.DATABASE_URL!);
const triageInputsSchema = triageInputSchema.array();

function isAuthorized(authHeader: string | undefined, apiKey: string | undefined): boolean {
  if (!apiKey) {
    return false;
  }
  const provided = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (authHeader ?? "");
  const expected = Buffer.from(apiKey);
  const actual = Buffer.from(provided);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const app = new Hono();

app.get("/", (c) => c.json({ status: "ok", function: "triage" }));

app.post("/", async (c) => {
  if (
    !isAuthorized(
      c.req.header("authorization") ?? c.req.header("x-api-key"),
      process.env.TRIAGE_API_KEY,
    )
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: { ticketId?: string };
  try {
    body = await c.req.json<{ ticketId?: string }>();
  } catch {
    return c.json({ error: "Request body must be valid JSON." }, 400);
  }

  const ticketId = body.ticketId;
  if (!ticketId) {
    return c.json({ error: "ticketId is required" }, 400);
  }

  const [ticket] = triageInputsSchema.parse(await sql`
    select subject, body, priority
    from support_tickets
    where id = ${ticketId}
  `);

  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  const classification = classifyTicket(ticket);
  const draft = draftTicketResponse(ticket, classification);

  await sql`
    update support_tickets
    set classification = ${JSON.stringify(classification)}::jsonb,
        draft_response = ${draft.response},
        status = 'drafted',
        updated_at = now()
    where id = ${ticketId}
  `;

  return c.json({
    ticketId,
    status: "drafted",
    needsHumanApproval: classification.needsHumanApproval,
    classification,
    draft,
  });
});

export default app;
