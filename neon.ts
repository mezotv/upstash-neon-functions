import { defineConfig } from "@neondatabase/config/v1";

/**
 * Infrastructure-as-code for this Neon project.
 *
 * `neonctl dev` runs the functions below locally (DATABASE_URL injected from
 * the linked branch); `neonctl deploy` applies this file to the linked branch.
 *
 * Note: Neon Functions are in private preview (AWS us-east-2, projects created
 * on/after 2026-06-15). See https://neon.com/docs/reference/neon-ts.
 */
export default defineConfig({
  // The app brings its own auth/REST surface (Next.js route handlers), so the
  // managed Neon services stay off.
  auth: false,
  dataApi: false,

  preview: {
    aiGateway: true,
    functions: {
      // HTTP-callable triage endpoint backed by the same logic the Upstash
      // workflow uses. Slug is permanent once deployed (^[a-z0-9]{1,20}$).
      triage: {
        name: "Ticket triage",
        source: "./functions/triage.ts",
        env: {
          TRIAGE_API_KEY: process.env.TRIAGE_API_KEY!,
          TRIAGE_MODEL: process.env.TRIAGE_MODEL ?? "gemini-3-5-flash",
          NEON_AI_GATEWAY_BASE_URL: process.env.NEON_AI_GATEWAY_BASE_URL!,
          NEON_AI_GATEWAY_TOKEN: process.env.NEON_AI_GATEWAY_TOKEN!,
        },
      },
    },
  },

  // Per-branch policy: protect the default branch, and let ephemeral
  // (preview/CI) branches expire and idle down to keep costs low.
  branch: (branch) => {
    if (branch.exists && branch.isDefault) {
      return { protected: true };
    }

    return {
      ttl: "7d",
      postgres: {
        computeSettings: {
          autoscalingLimitMinCu: 0.25,
          autoscalingLimitMaxCu: 1,
        },
      },
    };
  },
});
