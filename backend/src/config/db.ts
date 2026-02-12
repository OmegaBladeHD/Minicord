import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({ connectionString: env.postgresUrl });

export const query = <T>(text: string, params?: unknown[]) => pool.query<T>(text, params);
