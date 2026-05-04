import Fastify from 'fastify';
import postgres from 'postgres';
import { registerInternalRoutes } from './routes.js';

const PORT = Number(process.env.PORT || 3001);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!process.env.INTERNAL_API_TOKEN) {
    throw new Error('INTERNAL_API_TOKEN is required');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 8 });
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ ok: true, service: 'worker' }));

  await registerInternalRoutes(app, sql);

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
