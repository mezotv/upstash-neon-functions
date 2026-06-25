# Support Triage OS

A Next.js scaffold for an AI support triage worker built with Neon Postgres and
Upstash Workflow.

Incoming support tickets are stored in Neon, then an Upstash Workflow classifies
the ticket, drafts a response, waits for human approval when risk is high, and
finally resolves or escalates the ticket.

## Stack

- Next.js App Router for the demo UI and API routes
- Neon Postgres for ticket state and workflow audit data
- Upstash Workflow for durable, retried orchestration
- TypeScript, Tailwind CSS, and Zod

## Getting Started

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Set:

- `DATABASE_URL`: your Neon database connection string
- `TRIAGE_FUNCTION_URL`: the deployed Neon Function invocation URL
- `TRIAGE_API_KEY`: the server-side key passed to the Neon Function
- `TRIAGE_MODEL`: the Neon AI Gateway model used for classification and drafting
- `NEON_AI_GATEWAY_BASE_URL` / `NEON_AI_GATEWAY_TOKEN`: pulled by `neonctl deploy` when `preview.aiGateway` is enabled
- `NEXT_PUBLIC_TICKET_API_URL`: the browser-facing Neon Function URL
- `NEXT_PUBLIC_TICKET_API_KEY`: the browser-facing key sent to the Neon Function
- `NEXT_PUBLIC_API_KEY`: optional shared key used by the browser when calling app API routes
- `QSTASH_TOKEN`: optional Upstash QStash token for the workflow fallback path
- `APP_URL`: a public URL QStash can call for local development, or omit on Vercel

Create the database schema in Neon:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Flow

Create a ticket:

```bash
curl -X POST "$NEXT_PUBLIC_TICKET_API_URL" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $NEXT_PUBLIC_TICKET_API_KEY" \
  -d '{
    "customerEmail": "ada@example.com",
    "subject": "API timeout on checkout",
    "body": "We are seeing timeout errors from the webhook endpoint during checkout.",
    "priority": "high"
  }'
```

Triage an existing ticket:

```bash
curl -X POST "$NEXT_PUBLIC_TICKET_API_URL" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $NEXT_PUBLIC_TICKET_API_KEY" \
  -d '{ "ticketId": "00000000-0000-0000-0000-000000000000" }'
```

Approve a ticket waiting for review:

```bash
curl -X POST http://localhost:3000/api/approvals \
  -H "content-type: application/json" \
  -d '{
    "ticketId": "00000000-0000-0000-0000-000000000000",
    "approved": true,
    "note": "Looks good to send."
  }'
```

## Triage Function

The board and ticket form call the deployed Neon Function directly when
`NEXT_PUBLIC_TICKET_API_URL` is set:

- `GET /` lists tickets
- `POST /` creates and triages a ticket, or triages an existing ticket with `ticketId`
- `PATCH /` updates a ticket status

If `NEXT_PUBLIC_TICKET_API_URL` is omitted, the app falls back to its local
Next.js API routes.

Classification and draft generation run inside the Neon Function through the
AI SDK and Neon AI Gateway. The default model is `gemini-3-5-flash`; set
`TRIAGE_MODEL` to switch models without changing code. If the gateway call
fails or credentials are missing, the function returns a visible error. Set
`ALLOW_TRIAGE_FALLBACK=true` only when you want deterministic local triage as a
fallback.

## Workflow Fallback

The durable Upstash workflow fallback lives at:

- `POST /api/workflows/ticket-triage`

If the Neon Function URL is not configured, the intake route triggers it with an
initial payload:

```json
{
  "ticketId": "ticket uuid"
}
```

The current classifier and draft generator are deterministic placeholders in
`src/lib/triage.ts`. Replace them with an LLM call when you are ready to connect
AI Gateway, OpenAI, Anthropic, or another provider.
