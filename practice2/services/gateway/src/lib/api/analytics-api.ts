import { createQuery } from '@tanstack/svelte-query';
import { apiFetch } from './client';

export const analyticsKeys = {
  all: ['analytics'] as const,
  data: (month?: string) => [...analyticsKeys.all, month ?? 'default'] as const
};

export type AnalyticsData = {
  monthlyTotals: { month: string; total: number }[];
  categoryTotals: {
    categoryId: number;
    name: string;
    icon: string | null;
    color: string;
    total: number;
  }[];
  monthlyCategoryBreakdown: {
    month: string;
    categoryId: number;
    name: string;
    color: string;
    total: number;
  }[];
};

async function fetchAnalytics(month?: string): Promise<AnalyticsData> {
  const url = month ? `/api/analytics?month=${month}` : '/api/analytics';
  return apiFetch<AnalyticsData>(url);
}

export const queries = {
  useAnalytics: (getMonth: () => string | undefined) =>
    createQuery(() => {
      const month = getMonth();
      return {
        queryKey: analyticsKeys.data(month),
        queryFn: () => fetchAnalytics(month)
      };
    })
};
