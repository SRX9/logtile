import "dotenv/config";
import { Pool } from "pg";

// The Pool will automatically use the standard PG* env variables
// Refer: https://node-postgres.com/api/pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const disconnect = () => pool.end();
