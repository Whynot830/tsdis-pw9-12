import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  register,
  routeLabel
} from '$lib/server/metrics';

/** Prometheus: /metrics без аутентификации (практика №4). */
const handlePrometheusMetrics: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === '/metrics') {
    const body = await register.metrics();
    return new Response(body, {
      headers: { 'Content-Type': register.contentType }
    });
  }

  const started = performance.now();
  const response = await resolve(event);
  const seconds = (performance.now() - started) / 1000;
  const route = routeLabel(event);
  const { method } = event.request;
  const code = String(response.status);

  httpRequestsTotal.inc({ method, route, code });
  httpRequestDurationSeconds.observe({ method, route }, seconds);

  return response;
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handlePrometheusMetrics, handleBetterAuth);
