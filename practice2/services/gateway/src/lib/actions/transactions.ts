import { toast } from 'svelte-sonner';
import type { Transaction } from '$lib/types';
import type { CreateTransactionInput } from '$lib/api';

type MutationWithMutateAsync<T> = { mutateAsync: (input: T) => Promise<unknown> };

/**
 * Creates a reusable save transaction handler (create or update).
 */
export function createSaveTransactionHandler(
  createMutation: MutationWithMutateAsync<CreateTransactionInput>,
  updateMutation: MutationWithMutateAsync<CreateTransactionInput & { id: number }>,
  getEditingTransaction: () => Transaction | null
) {
  return async (data: CreateTransactionInput) => {
    const editing = getEditingTransaction();
    if (editing) {
      await updateMutation.mutateAsync({ ...data, id: editing.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };
}

/**
 * Creates a reusable delete transaction handler with toast feedback.
 */
export function createDeleteTransactionHandler(
  mutation: MutationWithMutateAsync<Transaction>,
  options?: {
    onSuccess?: () => void;
    errorMessage?: string;
  }
) {
  return async (tx: Transaction) => {
    if (!tx) return;
    try {
      await mutation.mutateAsync(tx);
      toast.success('Transaction deleted');
      options?.onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : (options?.errorMessage ?? 'Failed to delete transaction')
      );
    }
  };
}
