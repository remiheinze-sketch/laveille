import pg from 'pg';
import 'dotenv/config';
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 10,
});

export async function ensureSchema(sqlText) {
  await pool.query(sqlText);
}
