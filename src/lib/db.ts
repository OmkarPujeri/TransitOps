import { Pool, type QueryResultRow } from "pg";

// A single pooled connection to local Postgres, cached across hot reloads in dev
// so we don't exhaust connections. Used by the data-access adapter in
// src/lib/supabase/server.ts and by auth.
const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export const pool: Pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.__pgPool = pool;

/** Run a parameterized query and return the rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}
