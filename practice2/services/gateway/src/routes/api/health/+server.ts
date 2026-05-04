import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Liveness/readiness для Docker и Kubernetes. */
export const GET: RequestHandler = async () =>
  json({ ok: true, service: 'gateway' }, { status: 200 });
