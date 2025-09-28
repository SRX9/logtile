import { Pool } from "pg";

const connectionString = process.env.POSTGRES_DB_URL || "";

if (!connectionString) {
  throw new Error(
    "Database connection string is missing. Please set POSTGRES_DB_URL or DATABASE_URL",
  );
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

export default pool;

export const fetchRows = async <T = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> => {
  const { rows } = await pool.query(sql, params);

  return rows as T[];
};

export const fetchSingle = async <T = any>(sql: string, params: any[] = []) => {
  const rows = await fetchRows<T>(sql, params);

  return rows[0] as T | undefined;
};

export const upsertBalanceUsage = async (data: Record<string, any>) => {
  const columns = Object.keys(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const updates = columns.map((c) => `${c}=EXCLUDED.${c}`).join(", ");
  const values = Object.values(data);

  const sql = `INSERT INTO chaitea.balance_usage (${columns.join(
    ", ",
  )}) VALUES (${placeholders}) ON CONFLICT (user_id) DO UPDATE SET ${updates}`;

  await pool.query(sql, values);
};
