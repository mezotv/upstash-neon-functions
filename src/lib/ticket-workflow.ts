import { Client } from "@upstash/workflow";

import { getAppBaseUrl } from "@/lib/url";

export function isTicketWorkflowConfigured() {
  return Boolean(process.env.QSTASH_TOKEN);
}

export async function startTicketTriageWorkflow(
  request: Request,
  input: {
    ticketId: string;
    priority: string;
  },
) {
  const qstashToken = process.env.QSTASH_TOKEN;

  if (!qstashToken) {
    throw new Error("QSTASH_TOKEN is required to trigger the Upstash Workflow.");
  }

  const client = new Client({ token: qstashToken });
  const workflowUrl = new URL(
    "/api/workflows/ticket-triage",
    getAppBaseUrl(request),
  ).toString();

  return client.trigger({
    url: workflowUrl,
    body: { ticketId: input.ticketId },
    workflowRunId: `ticket-${input.ticketId}-${Date.now()}`,
    retries: 3,
    label: ["support-triage", input.priority],
  });
}
