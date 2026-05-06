import Fastify from 'fastify';
import postgres from 'postgres';
import { registerInternalRoutes } from './routes.js';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  register as metricsRegister
} from './metrics.js';

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

  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions?.url ?? request.url.split('?')[0] ?? 'unknown';
    const seconds = reply.elapsedTime / 1000;
    const { method } = request;
    const code = String(reply.statusCode);
    httpRequestsTotal.inc({ method, route, code });
    httpRequestDurationSeconds.observe({ method, route }, seconds);
  });

  app.get('/health', async () => ({ ok: true, service: 'worker' }));

  app.get('/metrics', async (_req, reply) => {
    const body = await metricsRegister.metrics();
    return reply.type(metricsRegister.contentType).send(body);
  });

  await registerInternalRoutes(app, sql);

  await app.listen({ port: PORT, host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
