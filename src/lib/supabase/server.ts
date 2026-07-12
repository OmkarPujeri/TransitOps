/**
 * Local Postgres adapter — drop-in replacement for the Supabase server client.
 *
 * Every page and server action in the app calls `createClient()` and then uses
 * the Supabase chainable query API (`.from().select().eq()…`).  Rather than
 * rewriting 20+ consumer files, this module returns an object with the *same*
 * surface backed by the local `pg` pool, `src/lib/auth.ts`, and `src/lib/storage.ts`.
 *
 * Supported patterns:
 *   supabase.from("table").select("*")               — all columns
 *   supabase.from("table").select("col1, col2")      — specific columns
 *   supabase.from("table").select("*, rel(*)")        — with LEFT JOIN embed
 *   supabase.from("table").select("*, rel(col)")      — embed with specific cols
 *   .insert(payload)  .update(payload)  .delete()
 *   .eq()  .neq()  .lte()  .order()  .single()
 *   supabase.auth.getUser / signInWithPassword / signUp / signOut
 *   supabase.storage.from("bucket").upload / remove / createSignedUrl
 */

import { query } from "@/lib/db";
import {
  getSession,
  verifyPassword,
  hashPassword,
  signSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { createStorageAdapter } from "@/lib/storage";
import type { Role } from "@/lib/types";

// ---------------------------------------------------------------------------
// Foreign-key map: tells the adapter which column in `mainTable` references
// `relatedTable.id` so it can build the correct LEFT JOIN subquery.
// ---------------------------------------------------------------------------
const FK_MAP: Record<string, Record<string, string>> = {
  trips:              { vehicles: "vehicle_id", drivers: "driver_id" },
  maintenance_logs:   { vehicles: "vehicle_id" },
  fuel_logs:          { vehicles: "vehicle_id", trips: "trip_id" },
  expenses:           { vehicles: "vehicle_id", trips: "trip_id" },
  vehicle_documents:  { vehicles: "vehicle_id" },
};

// ---------------------------------------------------------------------------
// Select-string parser  (e.g.  "*, vehicles(*), drivers(full_name)")
// ---------------------------------------------------------------------------
interface Embed {
  alias: string;   // related table name, e.g. "vehicles"
  columns: string; // "*" or "reg_number" or "reg_number, full_name"
  fk: string;      // FK column in the main table
}

function parseSelect(
  table: string,
  selectStr: string
): { columns: string; embeds: Embed[] } {
  const embeds: Embed[] = [];
  const embedRe = /(\w+)\(([^)]+)\)/g;
  let cleaned = selectStr;
  let m: RegExpExecArray | null;

  while ((m = embedRe.exec(selectStr)) !== null) {
    const alias = m[1];
    const cols = m[2].trim();
    const fk = FK_MAP[table]?.[alias];
    if (fk) {
      embeds.push({ alias, columns: cols, fk });
      cleaned = cleaned.replace(m[0], "");
    }
  }

  // Remove leftover commas / whitespace
  cleaned = cleaned
    .replace(/,\s*,/g, ",")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();
  if (!cleaned) cleaned = "*";

  return { columns: cleaned, embeds };
}

// ---------------------------------------------------------------------------
// Chainable query builder (thenable so `await` triggers execution)
// ---------------------------------------------------------------------------
type FilterOp = "=" | "<>" | "<=";

interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

interface OrderClause {
  column: string;
  ascending: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
class QueryBuilder {
  private _table: string;
  private _op: "select" | "insert" | "update" | "delete" = "select";
  private _selectStr = "*";
  private _filters: Filter[] = [];
  private _orders: OrderClause[] = [];
  private _isSingle = false;
  private _payload: Record<string, unknown> | null = null;

  constructor(table: string) {
    this._table = table;
  }

  // ---- Operation setters ---------------------------------------------------

  select(columns = "*"): this {
    this._op = "select";
    this._selectStr = columns;
    return this;
  }

  insert(payload: Record<string, unknown>): this {
    this._op = "insert";
    this._payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this._op = "update";
    this._payload = payload;
    return this;
  }

  delete(): this {
    this._op = "delete";
    return this;
  }

  // ---- Filter / modifier helpers -------------------------------------------

  eq(column: string, value: unknown): this {
    this._filters.push({ column, op: "=", value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this._filters.push({ column, op: "<>", value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ column, op: "<=", value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this._orders.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  single(): this {
    this._isSingle = true;
    return this;
  }

  // ---- Thenable: `await builder` triggers execution ------------------------

  then(
    resolve?: ((v: any) => any) | null,
    reject?: ((e: any) => any) | null
  ): Promise<any> {
    return this._execute().then(resolve, reject);
  }

  // ---- Private execution ---------------------------------------------------

  private async _execute(): Promise<{ data: any; error: any }> {
    try {
      switch (this._op) {
        case "select":
          return await this._execSelect();
        case "insert":
          return await this._execInsert();
        case "update":
          return await this._execUpdate();
        case "delete":
          return await this._execDelete();
        default:
          return { data: null, error: { message: `Unknown op: ${this._op}` } };
      }
    } catch (err: any) {
      return {
        data: null,
        error: { message: err.message ?? String(err), code: err.code },
      };
    }
  }

  /** Build a WHERE clause from accumulated filters. */
  private _buildWhere(startIdx = 1): { clause: string; params: unknown[] } {
    if (this._filters.length === 0) return { clause: "", params: [] };
    const parts: string[] = [];
    const params: unknown[] = [];
    this._filters.forEach((f, i) => {
      parts.push(`"${f.column}" ${f.op} $${startIdx + i}`);
      params.push(f.value);
    });
    return { clause: `WHERE ${parts.join(" AND ")}`, params };
  }

  /** Build an ORDER BY clause. */
  private _buildOrder(): string {
    if (this._orders.length === 0) return "";
    return (
      "ORDER BY " +
      this._orders
        .map((o) => `"${o.column}" ${o.ascending ? "ASC" : "DESC"}`)
        .join(", ")
    );
  }

  // -- SELECT ----------------------------------------------------------------
  private async _execSelect() {
    const { columns, embeds } = parseSelect(this._table, this._selectStr);
    const { clause: where, params } = this._buildWhere();
    const order = this._buildOrder();

    // Main columns
    let mainCols: string;
    if (columns === "*") {
      mainCols = `"${this._table}".*`;
    } else {
      mainCols = columns
        .split(",")
        .map((c) => `"${this._table}"."${c.trim()}"`)
        .join(", ");
    }

    // Embedded-relation subqueries (avoids column-name collisions from JOINs)
    let embedSQL = "";
    if (embeds.length > 0) {
      const subs = embeds.map((e) => {
        const fkRef = `"${this._table}"."${e.fk}"`;
        if (e.columns === "*") {
          return `(SELECT row_to_json(__sub.*) FROM "${e.alias}" __sub WHERE __sub.id = ${fkRef}) AS "${e.alias}"`;
        }
        const cols = e.columns.split(",").map((c) => c.trim());
        const jsonParts = cols.map((c) => `'${c}', __sub."${c}"`).join(", ");
        return `(SELECT json_build_object(${jsonParts}) FROM "${e.alias}" __sub WHERE __sub.id = ${fkRef}) AS "${e.alias}"`;
      });
      embedSQL = ", " + subs.join(", ");
    }

    const sql = `SELECT ${mainCols}${embedSQL} FROM "${this._table}" ${where} ${order}`;
    const rows = await query(sql, params);

    return { data: this._isSingle ? rows[0] ?? null : rows, error: null };
  }

  // -- INSERT ----------------------------------------------------------------
  private async _execInsert() {
    const p = this._payload!;
    const keys = Object.keys(p);
    const cols = keys.map((k) => `"${k}"`).join(", ");
    const phs = keys.map((_, i) => `$${i + 1}`).join(", ");
    const vals = keys.map((k) => p[k]);

    const sql = `INSERT INTO "${this._table}" (${cols}) VALUES (${phs}) RETURNING *`;
    const rows = await query(sql, vals);
    return { data: rows[0] ?? null, error: null };
  }

  // -- UPDATE ----------------------------------------------------------------
  private async _execUpdate() {
    const p = this._payload!;
    const keys = Object.keys(p);
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const vals = keys.map((k) => p[k]);
    const { clause: where, params: wp } = this._buildWhere(keys.length + 1);

    const sql = `UPDATE "${this._table}" SET ${sets} ${where} RETURNING *`;
    const rows = await query(sql, [...vals, ...wp]);
    return { data: rows, error: null };
  }

  // -- DELETE ----------------------------------------------------------------
  private async _execDelete() {
    const { clause: where, params } = this._buildWhere();
    const sql = `DELETE FROM "${this._table}" ${where} RETURNING *`;
    const rows = await query(sql, params);
    return { data: rows, error: null };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Public API — mirrors the Supabase `createClient()` contract
// ---------------------------------------------------------------------------

export async function createClient() {
  // Read the session once per request (from the HttpOnly cookie).
  const session = await getSession();

  return {
    from(table: string) {
      return new QueryBuilder(table);
    },

    auth: {
      async getUser() {
        if (!session) return { data: { user: null } };
        return {
          data: {
            user: { id: session.id, email: session.email },
          },
        };
      },

      async signInWithPassword({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) {
        const rows = await query<{
          id: string;
          email: string;
          password_hash: string;
          full_name: string | null;
          role: string;
        }>(
          `SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1`,
          [email]
        );
        if (rows.length === 0) {
          return { error: { message: "Invalid login credentials" } };
        }

        const u = rows[0];
        const valid = await verifyPassword(password, u.password_hash);
        if (!valid) {
          return { error: { message: "Invalid login credentials" } };
        }

        const token = await signSession({
          id: u.id,
          email: u.email,
          role: u.role as Role,
          full_name: u.full_name,
        });
        await setSessionCookie(token);
        return { error: null };
      },

      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown> };
      }) {
        const full_name = String(options?.data?.full_name ?? "");
        const role = String(options?.data?.role ?? "fleet_manager");
        const hash = await hashPassword(password);

        try {
          const rows = await query<{
            id: string;
            email: string;
            full_name: string | null;
            role: string;
          }>(
            `INSERT INTO users (email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4::app_role)
             RETURNING id, email, full_name, role`,
            [email, hash, full_name || null, role]
          );
          const u = rows[0];
          const token = await signSession({
            id: u.id,
            email: u.email,
            role: u.role as Role,
            full_name: u.full_name,
          });
          await setSessionCookie(token);
          return { error: null };
        } catch (err: any) {
          if (err.code === "23505") {
            return {
              error: { message: "A user with this email already exists." },
            };
          }
          return { error: { message: err.message ?? String(err) } };
        }
      },

      async signOut() {
        await clearSessionCookie();
      },
    },

    storage: {
      from(bucket: string) {
        return createStorageAdapter(bucket);
      },
    },
  };
}

/**
 * Service-role client for privileged server-side operations (e.g. AI tools
 * that read across all rows). No auth / cookie context needed.
 */
export function createServiceClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
  };
}
