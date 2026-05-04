<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import type { Category, Transaction } from '$lib/types.js';
  import TransactionFormFields from './transaction-form-fields.svelte';

  let {
    open = $bindable(false),
    editingTransaction = null,
    categories = [],
    saveTransaction,
    onSaved = () => {},
    onCancel = () => {}
  }: {
    open?: boolean;
    editingTransaction?: Transaction | null;
    categories?: Category[];
    saveTransaction: (data: {
      categoryId: number;
      amount: number;
      description?: string | null;
      createdAt: string;
    }) => Promise<void>;
    onSaved?: () => void | Promise<void>;
    onCancel?: () => void;
  } = $props();

  function getInitialData(tx: Transaction | null) {
    if (tx) {
      const d = new Date(tx.createdAt);
      return {
        amount: tx.amount / 100,
        categoryId: tx.categoryId as number | null,
        description: tx.description ?? '',
        date: d.toISOString().slice(0, 10)
      };
    }
    const d = new Date();
    return {
      amount: 0,
      categoryId: null as number | null,
      description: '',
      date: d.toISOString().slice(0, 10)
    };
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{editingTransaction ? 'Edit expense' : 'New expense'}</Dialog.Title>
    </Dialog.Header>

    {#if open}
      {#key editingTransaction?.id ?? 'new'}
        <TransactionFormFields
          initialData={getInitialData(editingTransaction)}
          {editingTransaction}
          {categories}
          {saveTransaction}
          {onSaved}
          {onCancel}
          bind:open
        />
      {/key}
    {/if}
  </Dialog.Content>
</Dialog.Root>
