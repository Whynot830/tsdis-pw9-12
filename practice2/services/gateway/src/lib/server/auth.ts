import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

const origin = env.ORIGIN ?? '';
const isLocalHttp =
  origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');

const trustedOrigins = [...new Set([origin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean))];

export const auth = betterAuth({
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, { provider: 'pg' }),
  debug: process.env.NODE_ENV !== 'production',
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  advanced: {
    // В Docker NODE_ENV=production + http://localhost: иначе Secure-cookies не ставятся — OAuth «ломается» после редиректа.
    useSecureCookies: process.env.NODE_ENV === 'production' && !isLocalHttp
  },
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET
          }
        }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET
          }
        }
      : {})
  },
  plugins: [sveltekitCookies(getRequestEvent)]
});
