const SITE_NAME = 'WhyNot Finances';
const DEFAULT_DESCRIPTION =
  'Personal finance tracker — track expenses, manage categories, and analyze spending.';

export const seoConfig: Record<string, { title: string; description: string }> = {
  '/': { title: 'Expenses', description: 'Recent expenses and spending overview' },
  '/transactions': {
    title: 'Transactions',
    description: 'View and manage all your transactions'
  },
  '/categories': {
    title: 'Categories',
    description: 'Manage expense categories'
  },
  '/analytics': {
    title: 'Analytics',
    description: 'Spending analytics and charts'
  },
  '/login': {
    title: 'Sign in',
    description: 'Sign in to your account'
  }
};

export function getSeoForPath(pathname: string) {
  const exact = seoConfig[pathname];
  if (exact) return exact;

  // Match by prefix (e.g. /transactions/123)
  const match = Object.keys(seoConfig)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (match) return seoConfig[match];

  return {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION
  };
}

export function getFullTitle(title: string) {
  return title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;
}
