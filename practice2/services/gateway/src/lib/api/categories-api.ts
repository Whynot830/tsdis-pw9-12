import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { apiFetch } from './client';
import { analyticsKeys } from './analytics-api';
import type { Category } from '$lib/types';

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all] as const,
  detail: (id: number) => [...categoryKeys.all, 'detail', id] as const
};

async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories');
}

export type CreateCategoryInput = {
  name: string;
  icon?: string | null;
  color: string;
};

export type UpdateCategoryInput = CreateCategoryInput & { id: number };

export const queries = {
  useCategoriesList: () =>
    createQuery(() => ({
      queryKey: categoryKeys.list(),
      queryFn: fetchCategories
    })),

  useCategory: (id: number | undefined, enabled = true) =>
    createQuery(() => ({
      queryKey: categoryKeys.detail(id!),
      queryFn: () => apiFetch<Category>(`/api/categories/${id}`),
      enabled: enabled && id != null
    }))
};

export const mutations = {
  useCreateCategory: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async (input: CreateCategoryInput) =>
        apiFetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify(input)
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      }
    }));
  },

  useUpdateCategory: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async ({ id, ...input }: UpdateCategoryInput) =>
        apiFetch(`/api/categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(input)
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      }
    }));
  },

  useDeleteCategory: () => {
    const queryClient = useQueryClient();
    return createMutation(() => ({
      mutationFn: async (cat: Category) =>
        apiFetch(`/api/categories/${cat.id}`, { method: 'DELETE' }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      }
    }));
  }
};
