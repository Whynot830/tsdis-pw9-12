import { writable } from 'svelte/store';

export type HeaderExtras = {
  showAddButton: boolean;
  thisMonth: number | null;
  loading: boolean;
};

export const headerExtras = writable<HeaderExtras>({
  showAddButton: false,
  thisMonth: null,
  loading: false
});

export const openAddExpense = writable(false);
export const openAddCategory = writable(false);
