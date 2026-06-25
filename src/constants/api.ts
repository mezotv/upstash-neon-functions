const ticketApiKey =
  process.env.NEXT_PUBLIC_TICKET_API_KEY ?? process.env.NEXT_PUBLIC_API_KEY;

export const TICKET_API_URL =
  process.env.NEXT_PUBLIC_TICKET_API_URL ?? "/api/tickets";

export const TICKET_TRIAGE_API_URL =
  process.env.NEXT_PUBLIC_TICKET_API_URL ?? "/api/tickets/triage";

export const ticketApiHeaders: Record<string, string> = ticketApiKey
  ? { authorization: `Bearer ${ticketApiKey}` }
  : {};
