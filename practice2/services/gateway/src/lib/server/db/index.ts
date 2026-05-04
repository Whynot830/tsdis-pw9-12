import { building } from '$app/environment';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const url =
  env.DATABASE_URL ??
  (building
    ? 'postgresql://build:build@127.0.0.1:5432/build'
    : undefined);

if (!url) throw new Error('DATABASE_URL is not set');

const client = postgres(url, { max: building ? 1 : 10 });
export const db = drizzle(client, { schema });
