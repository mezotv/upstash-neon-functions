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

- `DATABASE_URL`: Neon Postgres connection string from Neon Console > Project > Connection Details. See [Connect from any app](https://neon.com/docs/connect/connect-from-any-app).
- `QSTASH_TOKEN`: Upstash QStash token from Upstash Console > QStash. See [QStash with Next.js](https://upstash.com/docs/qstash/quickstarts/vercel-nextjs).
- `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`: Upstash signing keys from Upstash Console > QStash > Signing Keys. See [Secure a Workflow](https://upstash.com/docs/workflow/howto/security).
- `APP_URL`: public URL QStash can call in local dev. Use a tunnel like [ngrok](https://ngrok.com/docs/guides/share-localhost/quickstart), for example `ngrok http 3000`. On Vercel, this can usually be omitted because `VERCEL_URL` is available.
- `TRIAGE_FUNCTION_URL`: deployed Neon Function URL after `neonctl deploy`. You can read it with `neonctl function get triage --branch production`. See [Neon Functions get started](https://neon.com/docs/compute/functions/get-started).
- `TRIAGE_API_KEY`: shared server-side key you choose. It must match the value used by the Next.js app and the Neon Function.
- `NEON_AI_GATEWAY_BASE_URL` / `NEON_AI_GATEWAY_TOKEN`: provisioned by Neon when `preview.aiGateway` is enabled and you run `neonctl deploy`. See [Neon AI Gateway get started](https://neon.com/docs/ai-gateway/get-started).

Neon services are declared in `neon.ts`; see the [neon.ts reference](https://neon.com/docs/reference/neon-ts).

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

Create a ticket through the app route, which starts the Upstash Workflow when
`QSTASH_TOKEN` is configured:

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "content-type: application/json" \
  -d '{
    "customerEmail": "ada@example.com",
    "subject": "API timeout on checkout",
    "body": "We are seeing timeout errors from the webhook endpoint during checkout.",
    "priority": "high"
  }'
```

Triage an existing ticket through Upstash Workflow:

```bash
curl -X POST http://localhost:3000/api/tickets/triage \
  -H "content-type: application/json" \
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

The deployed Neon Function is the worker API:

- `GET /` lists tickets
- `POST /` creates and triages a ticket, or triages an existing ticket with `ticketId`
- `PATCH /` updates a ticket status

The UI calls local Next.js routes. Those routes start Upstash Workflows when
configured, and the workflow calls this Neon Function for the AI/database work.

Classification and draft generation run inside the Neon Function through the
AI SDK and Neon AI Gateway. The default model is set in `src/constants/ai.ts`.
If the gateway call fails or credentials are missing, the function returns a
visible error.

## Upstash Workflow

The durable Upstash workflow lives at:

- `POST /api/workflows/ticket-triage`

When `QSTASH_TOKEN` is configured, ticket creation and manual triage trigger it
with an initial payload:

```json
{
  "ticketId": "ticket uuid"
}
```

The workflow calls the Neon Function for AI triage, records an approval waiter
for risky tickets, and resumes when `/api/approvals` notifies the human decision.
