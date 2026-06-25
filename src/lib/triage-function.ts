export class TriageFunctionError extends Error {
  constructor(
    readonly status: number,
    readonly detail: unknown,
  ) {
    super("Neon triage function failed.");
  }
}

export function isTriageFunctionConfigured() {
  return Boolean(process.env.TRIAGE_FUNCTION_URL && process.env.TRIAGE_API_KEY);
}

export async function callTriageFunction(ticketId: string): Promise<unknown> {
  const functionUrl = process.env.TRIAGE_FUNCTION_URL;
  const apiKey = process.env.TRIAGE_API_KEY;

  if (!functionUrl || !apiKey) {
    throw new Error(
      "TRIAGE_FUNCTION_URL and TRIAGE_API_KEY are required to call the Neon function.",
    );
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ticketId }),
  });

  let result: unknown = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new TriageFunctionError(response.status, result);
  }

  return result;
}
