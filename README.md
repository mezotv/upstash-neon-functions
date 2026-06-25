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
- `QSTASH_TOKEN`: your Upstash QStash token
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
curl -X POST http://localhost:3000/api/tickets \
  -H "content-type: application/json" \
  -d '{
    "customerEmail": "ada@example.com",
    "subject": "API timeout on checkout",
    "body": "We are seeing timeout errors from the webhook endpoint during checkout.",
    "priority": "high"
  }'
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

## Workflow Endpoint

The workflow lives at:

- `POST /api/workflows/ticket-triage`

The intake route triggers it with an initial payload:

```json
{
  "ticketId": "ticket uuid"
}
```

The current classifier and draft generator are deterministic placeholders in
`src/lib/triage.ts`. Replace them with an LLM call when you are ready to connect
AI Gateway, OpenAI, Anthropic, or another provider.
