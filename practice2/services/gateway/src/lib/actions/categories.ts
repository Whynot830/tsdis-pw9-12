import { toast } from 'svelte-sonner';
import type { Category } from '$lib/types';

type MutationWithMutateAsync<T> = { mutateAsync: (input: T) => Promise<unknown> };

/**
 * Creates a reusable delete category handler with toast feedback.
 */
export function createDeleteCategoryHandler(
  mutation: MutationWithMutateAsync<Category>,
  options?: {
    onSuccess?: () => void;
    errorMessage?: string;
  }
) {
  return async (cat: Category) => {
    if (!cat) return;
    try {
      await mutation.mutateAsync(cat);
      toast.success('Category deleted');
      options?.onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : (options?.errorMessage ?? 'Failed to delete category')
      );
    }
  };
}
