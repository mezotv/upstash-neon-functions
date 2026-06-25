import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

let sql: SqlClient | undefined;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Add it to your environment.");
  }

  sql ??= neon(databaseUrl);

  return sql;
}
