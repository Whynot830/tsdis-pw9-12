<script lang="ts">
  import { untrack } from 'svelte';
  import { transactionsApi, categoriesApi, type CreateTransactionInput } from '$lib/api';
  import {
    createDeleteTransactionHandler,
    createSaveTransactionHandler
  } from '$lib/actions/transactions';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import { IconDisplay } from '$lib/components/ui/icon-picker';
  import { createSvelteTable, FlexRender, TablePagination } from '$lib/components/ui/data-table';
  import {
    createColumnHelper,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    type SortingState,
    type ColumnFiltersState,
    type FilterFn
  } from '@tanstack/table-core';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import Check from '@lucide/svelte/icons/check';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import X from '@lucide/svelte/icons/x';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Plus from '@lucide/svelte/icons/plus';
  import * as Popover from '$lib/components/ui/popover';
  import * as Combobox from '$lib/components/ui/combobox';
  import * as Command from '$lib/components/ui/command';
  import { Calendar } from '$lib/components/ui/calendar';
  import {
    getLocalTimeZone,
    today,
    type CalendarDate as CalendarDateType
  } from '@internationalized/date';
  import Fuse from 'fuse.js';
  import { cn } from '$lib/utils';
  import { formatAmount, formatDate } from '$lib/utils/format';
  import CategoryIcon from '$lib/components/category-icon.svelte';
  import type { Category, Transaction } from '$lib/types';
  import TransactionForm from '$lib/components/transaction-form.svelte';
  import TransactionDeleteDialog from '$lib/components/transaction-delete-dialog.svelte';
  import { Skeleton } from '$lib/components/ui/skeleton';

  const transactionsQuery = transactionsApi.queries.useTransactionsList({ limit: 500 });
  const categoriesQuery = categoriesApi.queries.useCategoriesList();
  const createTransactionMutation = transactionsApi.mutations.useCreateTransaction();
  const updateTransactionMutation = transactionsApi.mutations.useUpdateTransaction();
  const deleteTransactionMutation = transactionsApi.mutations.useDeleteTransaction();

  const transactions = $derived(transactionsQuery.data ?? []);
  const categories = $derived(categoriesQuery.data ?? []);
  const loading = $derived(transactionsQuery.isPending || categoriesQuery.isPending);

  const saveTransaction = createSaveTransactionHandler(
    createTransactionMutation,
    updateTransactionMutation,
    () => editingTransaction
  );

  let formOpen = $state(false);
  let editingTransaction = $state<Transaction | null>(null);
  let deleteDialogOpen = $state(false);
  let deletingTransaction = $state<Transaction | null>(null);

  let sorting = $state<SortingState>([{ id: 'createdAt', desc: true }]);
  let columnFilters = $state<ColumnFiltersState>([]);
  let globalFilter = $state('');
  let pagination = $state({ pageIndex: 0, pageSize: 15 });
  let dateFrom = $state<CalendarDateType | undefined>(undefined);
  let dateTo = $state<CalendarDateType | undefined>(undefined);
  let categoryFilterId = $state<number | null>(null);
  let selectedCategory = $state<Category | null>(null);
  let categoryComboOpen = $state(false);
  const filteredBySearch = $derived.by(() => {
    const q = globalFilter.trim();
    if (!q) return transactions;
    const fuse = new Fuse(transactions, {
      keys: [
        { name: 'description', weight: 1 },
        { name: 'amount', getFn: (tx: Transaction) => String(tx.amount / 100), weight: 0.5 },
        { name: 'category.name', weight: 0.8 }
      ],
      threshold: 0.4,
      ignoreLocation: true
    });
    return fuse.search(q).map((r) => r.item);
  });

  const categoryFilterFn: FilterFn<Transaction> = (row, _columnId, filterValue: number | null) => {
    if (filterValue == null) return true;
    return row.original.category?.id === filterValue;
  };

  const dateRangeFilterFn: FilterFn<Transaction> = (
    row,
    _columnId,
    filterValue: [CalendarDateType | undefined, CalendarDateType | undefined]
  ) => {
    const [from, to] = filterValue;
    const date = new Date(row.original.createdAt);
    if (from) {
      const fromDate = from.toDate(getLocalTimeZone());
      fromDate.setHours(0, 0, 0, 0);
      if (date < fromDate) return false;
    }
    if (to) {
      const toDate = to.toDate(getLocalTimeZone());
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }
    return true;
  };

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

  const colHelper = createColumnHelper<Transaction>();
  const columns = [
    colHelper.accessor('createdAt', {
      header: 'Date',
      cell: (info) => formatDate(info.getValue()),
      sortingFn: 'datetime',
      filterFn: dateRangeFilterFn
    }),
    colHelper.accessor((row) => row.category?.name ?? '—', {
      id: 'category',
      header: 'Category',
      filterFn: categoryFilterFn
    }),
    colHelper.accessor('amount', {
      header: 'Amount',
      cell: (info) => formatAmount(info.getValue())
    }),
    colHelper.accessor('description', {
      header: 'Description',
      cell: (info) => info.getValue() ?? '—'
    }),
    colHelper.display({ id: 'actions', header: '', cell: () => null })
  ];

  const table = createSvelteTable({
    get data() {
      return filteredBySearch;
    },
    columns,
    state: {
      get sorting() {
        return sorting;
      },
      get columnFilters() {
        return columnFilters;
      },
      get pagination() {
        return pagination;
      }
    },
    onSortingChange: (updater) => {
      sorting = typeof updater === 'function' ? updater(sorting) : updater;
    },
    onColumnFiltersChange: (updater) => {
      columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
      pagination = { ...pagination, pageIndex: 0 };
    },
    onGlobalFilterChange: (updater) => {
      globalFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
      pagination = { ...pagination, pageIndex: 0 };
    },
    onPaginationChange: (updater) => {
      pagination = typeof updater === 'function' ? updater(pagination) : updater;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  $effect(() => {
    const from = dateFrom;
    const to = dateTo;
    untrack(() => {
      const hasFilter = from || to;
      table.getColumn('createdAt')?.setFilterValue(hasFilter ? [from, to] : undefined);
    });
  });

  $effect(() => {
    const catId = selectedCategory?.id;
    untrack(() => {
      table.getColumn('category')?.setFilterValue(catId ?? undefined);
      if (catId != null) {
        pagination = { ...pagination, pageIndex: 0 };
      }
    });
  });

  const df = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  function formatCalendarDate(d: CalendarDateType | undefined) {
    if (!d) return undefined;
    return df.format(d.toDate(getLocalTimeZone()));
  }
</script>

<div class="flex h-full flex-col sm:p-4 md:p-6">
  {#if loading}
    <Skeleton class="flex-1" />
  {:else}
    <Card.Root class="flex min-h-0 flex-1 flex-col gap-4.5 max-sm:rounded-none">
      <Card.Header class="shrink-0">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Combobox.Root bind:open={categoryComboOpen}>
              <Combobox.Trigger>
                {#snippet children({ props }: { props: Record<string, unknown> })}
                  <Button
                    {...props}
                    variant="outline"
                    class="gap-2"
                    style="background-color: {selectedCategory?.color}20; border-color: {selectedCategory?.color}40;"
                    size="sm"
                  >
                    {#if selectedCategory}
                      <IconDisplay name={selectedCategory.icon ?? undefined} class="size-4" />
                      {selectedCategory.name}
                    {:else}
                      Category
                    {/if}
                    <ChevronsUpDown class="opacity-50" />
                  </Button>
                {/snippet}
              </Combobox.Trigger>
              <Combobox.Content>
                <Command.Root class="max-md:rounded-none">
                  <Command.Input placeholder="Search categories..." />
                  <Command.List>
                    <Command.Empty>No categories found.</Command.Empty>
                    <Command.Group>
                      <Command.Item
                        value="All categories"
                        onSelect={() => {
                          selectedCategory = null;
                          categoryComboOpen = false;
                        }}
                        aria-checked={selectedCategory == null}
                        class="flex items-center justify-between"
                      >
                        <span>All categories</span>
                        <Check
                          class={cn(
                            'size-4 shrink-0',
                            selectedCategory != null && 'text-transparent'
                          )}
                        />
                      </Command.Item>
                      {#each categories as cat (cat.id)}
                        <Command.Item
                          value={cat.name}
                          onSelect={() => {
                            selectedCategory = cat;
                            categoryComboOpen = false;
                          }}
                          class="flex items-center justify-between"
                        >
                          <span class="flex items-center gap-2">
                            <span style="color: {cat.color}">
                              <IconDisplay name={cat.icon ?? undefined} class="text-inherit" />
                            </span>
                            {cat.name}
                          </span>
                          <Check
                            class={cn(
                              'size-4 shrink-0',
                              selectedCategory !== cat && 'text-transparent'
                            )}
                          />
                        </Command.Item>
                      {/each}
                    </Command.Group>
                  </Command.List>
                </Command.Root>
              </Combobox.Content>
            </Combobox.Root>
            <Popover.Root>
              <Popover.Trigger>
                {#snippet child({ props })}
                  <Button variant={dateFrom || dateTo ? 'default' : 'outline'} size="sm" {...props}>
                    <CalendarRange />
                    {#if dateFrom || dateTo}
                      {formatCalendarDate(dateFrom) ?? '…'} – {formatCalendarDate(dateTo) ?? '…'}
                    {:else}
                      Date range
                    {/if}
                  </Button>
                {/snippet}
              </Popover.Trigger>
              <Popover.Content class="w-auto p-0" align="start">
                <div class="flex flex-col sm:flex-row">
                  <div class="border-b sm:border-r sm:border-b-0">
                    <p class="px-4 pt-3 text-xs font-medium text-muted-foreground">From</p>
                    <Calendar
                      type="single"
                      bind:value={dateFrom}
                      maxValue={dateTo ?? today(getLocalTimeZone())}
                      captionLayout="dropdown"
                    />
                  </div>
                  <div>
                    <p class="px-4 pt-3 text-xs font-medium text-muted-foreground">To</p>
                    <Calendar
                      type="single"
                      bind:value={dateTo}
                      minValue={dateFrom}
                      maxValue={today(getLocalTimeZone())}
                      captionLayout="dropdown"
                    />
                  </div>
                </div>
                {#if dateFrom || dateTo}
                  <div class="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="w-full"
                      onclick={() => {
                        dateFrom = undefined;
                        dateTo = undefined;
                      }}
                    >
                      <X />
                      Clear filter
                    </Button>
                  </div>
                {/if}
              </Popover.Content>
            </Popover.Root>
            <Input
              placeholder="Amount, description..."
              bind:value={globalFilter}
              class="h-8 w-36 sm:w-48"
            />
          </div>
          <Button onclick={openCreate} size="sm">
            <Plus />
            Add expense
          </Button>
        </div>
      </Card.Header>
      <Card.Content class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 z-10 border-b bg-muted">
              {#each table.getHeaderGroups() as headerGroup}
                <tr>
                  {#each headerGroup.headers as header}
                    <th
                      class="px-3 py-2 text-left font-medium text-muted-foreground md:px-4 md:py-3"
                    >
                      {#if !header.isPlaceholder}
                        {#if header.column.getCanSort()}
                          <button
                            class="flex items-center gap-1 hover:text-foreground"
                            onclick={header.column.getToggleSortingHandler()}
                          >
                            <FlexRender
                              content={header.column.columnDef.header}
                              context={header.getContext()}
                            />
                            {#if header.column.getIsSorted() === 'asc'}
                              <ArrowUp class="size-4 text-foreground" />
                            {:else if header.column.getIsSorted() === 'desc'}
                              <ArrowDown class="size-4 text-foreground" />
                            {:else}
                              <ArrowUpDown class="size-4 opacity-40" />
                            {/if}
                          </button>
                        {:else}
                          <FlexRender
                            content={header.column.columnDef.header}
                            context={header.getContext()}
                          />
                        {/if}
                      {/if}
                    </th>
                  {/each}
                </tr>
              {/each}
            </thead>
            <tbody>
              {#each table.getRowModel().rows as row (row.id)}
                {@const tx = row.original}
                <tr class="border-b transition-colors hover:bg-muted/30">
                  {#each row.getVisibleCells() as cell}
                    <td class="px-3 py-2 font-medium md:px-4 md:py-3">
                      {#if cell.column.id === 'category'}
                        {#if tx.category}
                          <div class="flex items-center gap-2">
                            <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
                            {tx.category.name}
                          </div>
                        {:else}
                          <span class="text-muted-foreground">—</span>
                        {/if}
                      {:else if cell.column.id === 'amount'}
                        <span class="font-medium text-destructive">−{formatAmount(tx.amount)}</span>
                      {:else if cell.column.id === 'actions'}
                        <div class="flex justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            onclick={() => openEdit(tx)}
                            aria-label="Edit transaction"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onclick={() => openDelete(tx)}
                            aria-label="Delete transaction"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      {:else}
                        <FlexRender
                          content={cell.column.columnDef.cell}
                          context={cell.getContext()}
                        />
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
              {#if table.getRowModel().rows.length === 0}
                <tr>
                  <td colspan={5} class="px-4 py-8 text-center text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
        <TablePagination {table} itemLabel="transactions" />
      </Card.Content>
    </Card.Root>
  {/if}
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
