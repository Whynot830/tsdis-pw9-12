import type { LayoutLoad } from './$types';
import { getSeoForPath, getFullTitle } from '$lib/seo';

export const load: LayoutLoad = ({ url }) => {
  const { title, description } = getSeoForPath(url.pathname);
  return {
    seo: {
      title: getFullTitle(title),
      description
    }
  };
};
