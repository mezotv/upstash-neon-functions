import { timingSafeEqual } from "node:crypto";

export function isAuthorizedRequest(request: Request): boolean {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey) {
    return false;
  }

  const header =
    request.headers.get("authorization") ?? request.headers.get("x-api-key");
  const provided = header?.startsWith("Bearer ")
    ? header.slice(7)
    : (header ?? "");

  const expected = Buffer.from(apiKey);
  const actual = Buffer.from(provided);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
