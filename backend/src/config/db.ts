import { Pool } from 'pg';
import { env } from './env.js';

export type QueryResultRow<T> = {
  rows: T[];
  rowCount: number;
};

export const pool = new Pool({ connectionString: env.postgresUrl });

export const query = <T>(text: string, params?: unknown[]) =>
  (pool.query as unknown as (sql: string, values?: unknown[]) => Promise<QueryResultRow<T>>)(text, params);
