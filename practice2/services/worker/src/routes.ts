import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import { runBudgetCheck } from './budget-runner.js';
import { financeBudgetRecalculationsTotal } from './metrics.js';

export async function registerInternalRoutes(
  app: FastifyInstance,
  sql: postgres.Sql
): Promise<void> {
  app.post<{ Body: { userId?: string; reason?: string } }>(
    '/internal/recalculate',
    async (req, reply) => {
      const token = req.headers['x-internal-token'];
      if (token !== process.env.INTERNAL_API_TOKEN) {
        return reply.code(401).send({ error: 'unauthorized' });
      }

      const userId = req.body?.userId;
      if (!userId || typeof userId !== 'string') {
        return reply.code(400).send({ error: 'userId required' });
      }

      try {
        await runBudgetCheck(sql, userId);
        financeBudgetRecalculationsTotal.inc({ result: 'ok' });
        return reply.send({ ok: true });
      } catch (err) {
        financeBudgetRecalculationsTotal.inc({ result: 'error' });
        throw err;
      }
    }
  );
}
