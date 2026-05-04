import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { apiFetch } from './client';
import { analyticsKeys } from './analytics-api';
import type { Category, Transaction } from '$lib/types';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (params?: { limit?: number; categoryId?: number; startDate?: string; endDate?: string }) =>
    [...transactionKeys.all, params ?? {}] as const,
  detail: (id: number) => [...transactionKeys.all, 'detail', id] as const
};

export type TransactionWithCategory = Transaction & { category: Category | null };

async function fetchTransactions(params?: {
  limit?: number;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<TransactionWithCategory[]> {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.categoryId) search.set('categoryId', String(params.categoryId));
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  const url = `/api/transactions${search.toString() ? `?${search}` : ''}`;
  return apiFetch<TransactionWithCategory[]>(url);
}

export type CreateTransactionInput = {
  categoryId: number;
  amount: number;
  description?: string | null;
  createdAt: string;
};

export type UpdateTransactionInput = CreateTransactionInput & { id: number };

export const queries = {
  useTransactionsList: (params?: { limit?: number; categoryId?: number }) =>
    createQuery(() => ({
      queryKey: transactionKeys.list(params),
      queryFn: () => fetchTransactions(params)
    })),

  useTransaction: (id: number | undefined, enabled = true) =>
    createQuery(() => ({
      queryKey: transactionKeys.detail(id!),
      queryFn: () => apiFetch<TransactionWithCategory>(`/api/transactions/${id}`),
      enabled: enabled && id != null
    }))
};

export const mutations = {
  useCreateTransaction: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async (input: CreateTransactionInput) =>
        apiFetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(input)
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      }
    }));
  },

  useUpdateTransaction: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async ({ id, ...input }: UpdateTransactionInput) =>
        apiFetch(`/api/transactions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(input)
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      }
    }));
  },

  useDeleteTransaction: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async (tx: Transaction) =>
        apiFetch(`/api/transactions/${tx.id}`, { method: 'DELETE' }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      }
    }));
  }
};
