import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    throw redirect(302, '/');
  }
  return {};
};

export const actions: Actions = {
  signInSocial: async (event) => {
    const formData = await event.request.formData();
    const provider = formData.get('provider')?.toString() ?? 'github';

    try {
      const result = await auth.api.signInSocial({
        body: {
          provider: provider as 'github' | 'google',
          callbackURL: '/'
        }
      });

      if (result?.url) {
        throw redirect(302, result.url);
      }
    } catch (error) {
      if (error instanceof Response || (error as { status?: number })?.status === 302) {
        throw error;
      }
      if (error instanceof APIError) {
        return fail(400, { message: error.message || 'Sign in failed' });
      }
      console.error('[login signInSocial]', error);
      const devHint =
        process.env.NODE_ENV !== 'production' && error instanceof Error
          ? error.message
          : null;
      return fail(500, {
        message:
          devHint ??
          'Unexpected error — см. лог сервера (терминал npm run dev). Частые причины: не задан ORIGIN в gateway/.env, неверный DATABASE_URL, не совпадает redirect URI в Google с ORIGIN.'
      });
    }

    return fail(400, { message: 'Sign in failed' });
  }
};
