export const apiKeyHeader: Record<string, string> = process.env
  .NEXT_PUBLIC_API_KEY
  ? { authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}` }
  : {};
