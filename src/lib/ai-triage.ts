import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

import { aiTriageOutputSchema } from "@/schemas/ai-triage";
import type { TicketTriageResult } from "@/types/ai-triage";
import type { TriageInput } from "@/types/triage";
import { isRecord } from "@/utils/is-record";

async function normalizeNeonGatewayResponse(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return response;
  }

  const body = await response.clone().json().catch(() => null);
  if (!isRecord(body) || !Array.isArray(body.choices)) {
    return response;
  }

  const normalizedBody = {
    ...body,
    choices: body.choices.map((choice: unknown) => {
      if (!isRecord(choice) || !isRecord(choice.message)) {
        return choice;
      }

      const { message } = choice;
      if (!Array.isArray(message.content)) {
        return choice;
      }

      const content = message.content
        .filter(
          (part: unknown) =>
            isRecord(part) &&
            part.type === "text" &&
            typeof part.text === "string",
        )
        .map((part) => part.text)
        .join("");

      return {
        ...choice,
        message: {
          ...message,
          content,
        },
      };
    }),
  };

  return new Response(JSON.stringify(normalizedBody), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function getNeonGatewayModel() {
  const baseURL = process.env.NEON_AI_GATEWAY_BASE_URL;
  const apiKey = process.env.NEON_AI_GATEWAY_TOKEN;

  if (!baseURL || !apiKey) {
    return null;
  }

  const neonGateway = createOpenAICompatible({
    name: "neon-ai-gateway",
    baseURL: `${baseURL}/ai-gateway/mlflow/v1`,
    apiKey,
    fetch: normalizeNeonGatewayResponse,
  });

  return neonGateway.chatModel(process.env.TRIAGE_MODEL ?? "gemini-3-5-flash");
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

export async function generateAiTicketTriage(
  ticket: TriageInput,
): Promise<TicketTriageResult | null> {
  const model = getNeonGatewayModel();

  if (!model) {
    return null;
  }

  const { text } = await generateText({
    model,
    system:
      "You triage B2B SaaS support tickets. Return only valid JSON. Do not wrap it in markdown.",
    prompt: [
      `Subject: ${ticket.subject}`,
      `Priority: ${ticket.priority}`,
      "",
      "Customer message:",
      ticket.body,
      "",
      "Return JSON with exactly this shape:",
      "{",
      '  "priority": "low | normal | high | urgent",',
      '  "classification": {',
      '    "category": "billing | technical | account | product | security | general",',
      '    "sentiment": "positive | neutral | negative",',
      '    "confidence": 0.0,',
      '    "needsHumanApproval": true,',
      '    "summary": "one concise sentence"',
      "  },",
      '  "draft": {',
      '    "response": "customer-facing support reply",',
      '    "nextAction": "send | approve | escalate"',
      "  }",
      "}",
      "",
      "Rules:",
      "- category should be one of billing, technical, account, product, security, or general.",
      "- priority should be the real support severity inferred from the subject and message, not blindly copied from the user-selected priority.",
      "- use low for informational/non-blocking requests, normal for routine support, high for blocked users or significant product issues, and urgent for outages, security, data loss, major billing impact, or churn-risk language.",
      "- sentiment should be positive, neutral, or negative.",
      "- confidence must be between 0 and 1.",
      "- needsHumanApproval should be true for urgent, angry, security, legal, account ownership, outage, or high-risk billing issues.",
      "- draft.nextAction should be approve when needsHumanApproval is true, send for low-risk responses, or escalate for issues that should not be answered directly.",
      "- draft.response should be ready for a support teammate to review.",
    ].join("\n"),
  });

  return aiTriageOutputSchema.parse(parseJsonObject(text));
}
