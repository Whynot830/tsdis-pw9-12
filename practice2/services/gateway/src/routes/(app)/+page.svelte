<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import type { Transaction } from '$lib/types';
  import {
    createDeleteTransactionHandler,
    createSaveTransactionHandler
  } from '$lib/actions/transactions';
  import { transactionsApi, categoriesApi, type CreateTransactionInput } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Empty from '$lib/components/ui/empty';
  import { formatAmount, formatDateShort } from '$lib/utils/format';
  import CategoryIcon from '$lib/components/category-icon.svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import Wallet from '@lucide/svelte/icons/wallet';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import TransactionForm from '$lib/components/transaction-form.svelte';
  import TransactionDeleteDialog from '$lib/components/transaction-delete-dialog.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { headerExtras, openAddExpense } from '$lib/stores/header-store';
  import { readableColor } from '$lib/utils';

  const categoriesQuery = categoriesApi.queries.useCategoriesList();
  const transactionsQuery = transactionsApi.queries.useTransactionsList({ limit: 20 });
  const createTransactionMutation = transactionsApi.mutations.useCreateTransaction();
  const updateTransactionMutation = transactionsApi.mutations.useUpdateTransaction();
  const deleteTransactionMutation = transactionsApi.mutations.useDeleteTransaction();

  const categories = $derived(categoriesQuery.data ?? []);
  const transactions = $derived(transactionsQuery.data ?? []);
  const loadingTx = $derived(transactionsQuery.isPending);

  let totalThisMonth = $derived(
    transactions
      .filter((t: Transaction) => {
        const d = new Date(t.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
  );

  let formOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let editingTransaction = $state<Transaction | null>(null);
  let deletingTransaction = $state<Transaction | null>(null);

  const saveTransaction = createSaveTransactionHandler(
    createTransactionMutation,
    updateTransactionMutation,
    () => editingTransaction
  );

  function openCreate() {
    editingTransaction = null;
    formOpen = true;
  }

  function openEdit(tx: Transaction) {
    editingTransaction = tx;
    formOpen = true;
  }

  function openDelete(tx: Transaction) {
    deletingTransaction = tx;
    deleteDialogOpen = true;
  }

  const deleteTransaction = createDeleteTransactionHandler(deleteTransactionMutation, {
    onSuccess: () => {
      deleteDialogOpen = false;
      deletingTransaction = null;
    }
  });

  $effect(() => {
    headerExtras.set({
      showAddButton: true,
      thisMonth: loadingTx ? 0 : totalThisMonth,
      loading: loadingTx
    });
  });

  $effect(() => {
    if ($openAddExpense) {
      openCreate();
      openAddExpense.set(false);
    }
  });

  beforeNavigate(({ from, to }) => {
    if (from?.url.pathname === '/' && to?.url.pathname !== '/') {
      headerExtras.set({ showAddButton: false, thisMonth: null, loading: false });
    }
  });
</script>

<div
  class="container mx-auto flex h-full min-h-0 max-w-4xl flex-col space-y-4 overflow-hidden p-4 md:p-8"
>
  <div class="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
    <div class="flex shrink-0 items-center justify-between">
      <h2 class="font-semibold">Recent transactions</h2>
      <Button variant="ghost" size="sm" href="/transactions">
        View all <ArrowRight />
      </Button>
    </div>

    {#if loadingTx}
      <div class="space-y-2">
        {#each Array(5) as _}
          <Skeleton class="h-19" />
        {/each}
      </div>
    {:else if transactions.length === 0}
      <Empty.Root class="border-2 border-dashed">
        <Empty.Media variant="icon">
          <Wallet />
        </Empty.Media>
        <Empty.Header>
          <Empty.Title>No transactions yet</Empty.Title>
          <Empty.Description>Add your first expense to get started</Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <Button onclick={openCreate}>
            <Plus />
            Add expense
          </Button>
        </Empty.Content>
      </Empty.Root>
    {:else}
      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {#each transactions as tx (tx.id)}
          {@const cat = tx.category}
          <div
            class="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/30"
          >
            <CategoryIcon icon={cat?.icon} color={cat?.color ?? '#6b7280'} />

            <div class="min-w-0 flex-1">
              {#if tx.description}
                <p class="mt-0.5 truncate text-sm font-medium">{tx.description}</p>
              {/if}
              {#if cat}
                <Badge
                  variant="outline"
                  style="background-color: {cat.color}; border-color: {cat.color}60; color: {readableColor(
                    cat.color
                  )}"
                >
                  {cat.name}
                </Badge>
              {/if}
            </div>

            <!-- Amount & date -->
            <div class="shrink-0 text-right">
              <p class="font-semibold text-destructive">−{formatAmount(tx.amount)}</p>
              <p class="text-xs text-muted-foreground">{formatDateShort(tx.createdAt)}</p>
            </div>

            <div class="flex shrink-0 gap-1">
              <Button variant="secondary" size="icon" onclick={() => openEdit(tx)}>
                <Pencil />
              </Button>
              <Button variant="destructive" size="icon" onclick={() => openDelete(tx)}>
                <Trash2 />
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<TransactionForm bind:open={formOpen} {editingTransaction} {categories} {saveTransaction} />

<TransactionDeleteDialog
  bind:open={deleteDialogOpen}
  transaction={deletingTransaction}
  onConfirm={() => {
    if (deletingTransaction) deleteTransaction(deletingTransaction);
  }}
  onCancel={() => (deletingTransaction = null)}
/>
