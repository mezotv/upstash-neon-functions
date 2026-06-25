import { ticketsResponseSchema } from "@/schemas/ticket";

export async function listTicketsFromTicketApi() {
  const url = process.env.NEXT_PUBLIC_TICKET_API_URL;

  if (!url) {
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_TICKET_API_KEY;
  const response = await fetch(url, {
    cache: "no-store",
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Ticket API request failed with status ${response.status}.`);
  }

  return ticketsResponseSchema.parse(await response.json()).tickets;
}
