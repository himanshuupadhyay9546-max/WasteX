import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (typeof window !== 'undefined') {
    throw new Error('Database pool cannot be accessed on the client-side.');
  }
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/wastex';
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    });
  }
  return pool;
}

export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  const p = getDbPool();
  const res = await p.query(text, params);
  return res.rows;
}
