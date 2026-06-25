"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TICKET_PRIORITIES } from "@/constants/ticket";
import { apiKeyHeader } from "@/lib/api-key";
import { ticketInputSchema, ticketPrioritySchema } from "@/schemas/ticket";
import type { TicketFieldErrors, TicketSubmitResult } from "@/types/ticket-form";
import type { TicketInput } from "@/types/ticket";
import { isRecord } from "@/utils/is-record";
import { isTicketFieldName } from "@/utils/is-ticket-field-name";
import { parseTicketSubmitResult } from "@/utils/parse-ticket-submit-result";

const EMPTY: TicketInput = {
  customerEmail: "",
  subject: "",
  body: "",
  priority: "normal",
};

export default function TicketForm({
  onSuccess,
}: {
  onSuccess?: (result: TicketSubmitResult) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TicketInput>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<TicketFieldErrors>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [result, setResult] = useState<TicketSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof TicketInput>(
    key: K,
    value: TicketInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  function validate(): TicketInput | null {
    const parsed = ticketInputSchema.safeParse(form);
    if (parsed.success) {
      setFieldErrors({});
      return parsed.data;
    }

    const next: TicketFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (isTicketFieldName(key) && !next[key]) {
        next[key] = issue.message;
      }
    }
    setFieldErrors(next);
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const valid = validate();
    if (!valid) {
      setStatus("idle");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeader },
        body: JSON.stringify(valid),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      const parsed = parseTicketSubmitResult(data);
      setResult(parsed);
      setStatus("success");
      setForm(EMPTY);
      router.refresh();
      onSuccess?.(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerEmail">Customer email</Label>
          <Input
            id="customerEmail"
            type="email"
            value={form.customerEmail}
            onChange={(event) => update("customerEmail", event.target.value)}
            placeholder="ada@acme.com"
            aria-invalid={Boolean(fieldErrors.customerEmail)}
            aria-describedby={
              fieldErrors.customerEmail ? "customerEmail-error" : undefined
            }
          />
          {fieldErrors.customerEmail && (
            <p id="customerEmail-error" className="text-xs text-destructive">
              {fieldErrors.customerEmail}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={form.priority}
            onChange={(event) => {
              const priority = ticketPrioritySchema.safeParse(event.target.value);
              if (priority.success) update("priority", priority.data);
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} — {p.hint}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          type="text"
          value={form.subject}
          onChange={(event) => update("subject", event.target.value)}
          placeholder="Cannot export invoices to CSV"
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? "subject-error" : undefined}
        />
        {fieldErrors.subject && (
          <p id="subject-error" className="text-xs text-destructive">
            {fieldErrors.subject}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          rows={5}
          value={form.body}
          onChange={(event) => update("body", event.target.value)}
          placeholder="Describe the issue the customer is reporting..."
          className="resize-y"
          aria-invalid={Boolean(fieldErrors.body)}
          aria-describedby={fieldErrors.body ? "body-error" : undefined}
        />
        {fieldErrors.body && (
          <p id="body-error" className="text-xs text-destructive">
            {fieldErrors.body}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? "Adding..." : "Add to board"}
        </Button>
      </div>

      {status === "success" && (
        <div
          role="status"
          className="rounded-md border bg-muted/50 px-4 py-3 text-sm"
        >
          <p className="font-medium">Ticket accepted for triage.</p>
          <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
            {result?.ticketId ?? "(processing)"}
          </p>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-medium">Could not submit ticket.</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      )}
    </form>
  );
}
