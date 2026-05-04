<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ChevronsRight from '@lucide/svelte/icons/chevrons-right';

  interface PaginationTable {
    getRowModel: () => { rows: { length: number } };
    getFilteredRowModel: () => { rows: { length: number } };
    getState: () => { pagination: { pageSize: number; pageIndex: number } };
    getPageCount: () => number;
    getCanPreviousPage: () => boolean;
    getCanNextPage: () => boolean;
    setPageSize: (updater: number | ((old: number) => number)) => void;
    setPageIndex: (updater: number | ((old: number) => number)) => void;
    firstPage: () => void;
    lastPage: () => void;
    previousPage: () => void;
    nextPage: () => void;
  }

  let {
    table,
    itemLabel = 'items',
    pageSizeOptions = [10, 15, 25, 50] as const
  }: {
    table: PaginationTable;
    itemLabel?: string;
    pageSizeOptions?: readonly number[];
  } = $props();
</script>

<div class="flex shrink-0 items-center justify-between gap-2 border-t px-6 pt-3 sm:gap-4 md:gap-6">
  <p class="text-xs text-muted-foreground">
    {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length}
    {itemLabel}
  </p>
  <div class="flex items-center gap-2 sm:gap-4 md:gap-6">
    <div class="flex items-center gap-2 text-xs">
      <Select.Root
        type="single"
        value={String(table.getState().pagination.pageSize)}
        onValueChange={(v) => {
          if (v != null) {
            table.setPageSize(Number(v));
            table.setPageIndex(0);
          }
        }}
      >
        <Select.Trigger class="w-14" size="sm">
          {table.getState().pagination.pageSize}
        </Select.Trigger>
        <Select.Content>
          {#each pageSizeOptions as size}
            <Select.Item value={String(size)} label={String(size)}>{size}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      <span class="text-muted-foreground">per page</span>
    </div>
    {#if table.getPageCount() > 1}
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          disabled={!table.getCanPreviousPage()}
          onclick={() => table.firstPage()}
          aria-label="First page"
        >
          <ChevronsLeft class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          disabled={!table.getCanPreviousPage()}
          onclick={() => table.previousPage()}
          aria-label="Previous page"
        >
          <ChevronLeft class="size-4" />
        </Button>
        <span class="shrink-0 px-2 text-center text-sm whitespace-nowrap">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          disabled={!table.getCanNextPage()}
          onclick={() => table.nextPage()}
          aria-label="Next page"
        >
          <ChevronRight class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          disabled={!table.getCanNextPage()}
          onclick={() => table.lastPage()}
          aria-label="Last page"
        >
          <ChevronsRight class="size-4" />
        </Button>
      </div>
    {/if}
  </div>
</div>
