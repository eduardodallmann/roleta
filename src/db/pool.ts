import { Pool, type PoolConfig } from 'pg';

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL || '',
};

export const pool = new Pool(config);
