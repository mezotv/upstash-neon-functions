import { timingSafeEqual } from "node:crypto";

import { Hono, type Context } from "hono";

import {
  classifyTicket,
  draftTicketResponse,
} from "../src/lib/triage";
import { generateAiTicketTriage } from "../src/lib/ai-triage";
import {
  createTicket,
  finishTicket,
  getTicket,
  listTickets,
  saveTicketClassification,
  saveTicketDraft,
  updateTicketStatus,
} from "../src/lib/tickets";
import {
  approvalRequestSchema,
  ticketInputSchema,
  ticketStatusSchema,
} from "../src/schemas/ticket";
import { isRecord } from "../src/utils/is-record";

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
const corsHeaders = {
  "access-control-allow-headers": "authorization, x-api-key, content-type",
  "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
  "access-control-allow-origin": "*",
};

app.use("*", async (c, next) => {
  await next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.res.headers.set(key, value);
  }
});

app.options("*", (c) => c.body(null, 204));

app.get("/health", (c) =>
  c.json({
    status: "ok",
    function: "triage",
    version: "ai-gateway",
    aiGatewayConfigured: Boolean(
      process.env.NEON_AI_GATEWAY_BASE_URL && process.env.NEON_AI_GATEWAY_TOKEN,
    ),
    model: process.env.TRIAGE_MODEL ?? "gemini-3-5-flash",
  }),
);

function isAuthorizedContext(c: Context) {
  return isAuthorized(
    c.req.header("authorization") ?? c.req.header("x-api-key"),
    process.env.TRIAGE_API_KEY,
  );
}

async function triageTicket(ticketId: string) {
  const ticket = await getTicket(ticketId);

  if (!ticket) {
    return null;
  }

  let result = await generateAiTicketTriage(ticket);

  if (!result) {
    if (process.env.ALLOW_TRIAGE_FALLBACK !== "true") {
      throw new Error(
        "AI triage is not configured. Missing Neon AI Gateway environment.",
      );
    }

    const classification = classifyTicket(ticket);
    result = {
      priority: ticket.priority,
      classification,
      draft: draftTicketResponse(ticket, classification),
    };
  }

  const { priority, classification, draft } = result;
  await saveTicketClassification(ticket.id, classification, priority);

  await saveTicketDraft(
    ticket.id,
    draft,
    classification.needsHumanApproval ? "waiting_for_approval" : "drafted",
  );

  return {
    ticket: await getTicket(ticket.id),
    triage: {
      ticketId,
      status: classification.needsHumanApproval ? "waiting_for_approval" : "drafted",
      priority,
      needsHumanApproval: classification.needsHumanApproval,
      classification,
      draft,
    },
  };
}

async function applyApprovalDecision(input: {
  ticketId: string;
  approved: boolean;
  note?: string;
}) {
  const ticket = await getTicket(input.ticketId);

  if (!ticket) {
    return { status: 404, body: { error: "Ticket not found" } };
  }

  if (ticket.status !== "waiting_for_approval") {
    return { status: 409, body: { error: "Ticket is not awaiting approval." } };
  }

  const resolution = input.approved
    ? input.note
      ? `${ticket.draftResponse ?? "Approved reply."}\n\nReviewer note: ${input.note}`
      : ticket.draftResponse ?? "Approved reply."
    : input.note ?? "Reviewer requested escalation.";

  const updatedTicket = await finishTicket(
    ticket.id,
    input.approved ? "resolved" : "escalated",
    resolution,
  );

  return { status: 200, body: { ticket: updatedTicket } };
}

app.get("/tickets", async (c) => {
  if (
    !isAuthorizedContext(c)
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const tickets = await listTickets();
  return c.json({ tickets });
});

app.get("/", async (c) => {
  if (!isAuthorizedContext(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const tickets = await listTickets();
  return c.json({ tickets });
});

app.post("/", async (c) => {
  if (!isAuthorizedContext(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON." }, 400);
  }

  if (isRecord(body) && typeof body.ticketId === "string") {
    const approval = approvalRequestSchema.safeParse(body);
    if (approval.success) {
      const result = await applyApprovalDecision(approval.data);
      if (result.status === 200) {
        return c.json(result.body);
      }
      if (result.status === 404) {
        return c.json(result.body, 404);
      }
      return c.json(result.body, 409);
    }

    const result = await triageTicket(body.ticketId).catch((error) => ({
      error: error instanceof Error ? error.message : "AI triage failed.",
    }));

    if (!result) {
      return c.json({ error: "Ticket not found" }, 404);
    }

    if ("error" in result) {
      return c.json({ error: result.error }, 502);
    }

    return c.json(result);
  }

  const payload = ticketInputSchema.safeParse(body);

  if (!payload.success) {
    return c.json(
      {
        error: "Invalid ticket payload.",
        issues: payload.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const ticket = await createTicket(payload.data);
  await updateTicketStatus(ticket.id, "triaging");

  const result = await triageTicket(ticket.id).catch((error) => ({
    error: error instanceof Error ? error.message : "AI triage failed.",
  }));

  if (result && "error" in result) {
    return c.json({ ticket, error: result.error }, 502);
  }

  return c.json(result ?? { ticket }, 201);
});

app.patch("/", async (c) => {
  if (!isAuthorizedContext(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON." }, 400);
  }

  const payload = isRecord(body)
    ? ticketStatusSchema.safeParse(body.status)
    : ticketStatusSchema.safeParse(undefined);
  const ticketId = isRecord(body) && typeof body.id === "string" ? body.id : null;

  if (!ticketId || !payload.success) {
    return c.json({ error: "Invalid status update." }, 400);
  }

  const ticket = await updateTicketStatus(ticketId, payload.data);

  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  return c.json({ ticket });
});

export default app;
