<script lang="ts">
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import X from '@lucide/svelte/icons/x';
  import * as Combobox from '$lib/components/ui/combobox';
  import { Button, buttonVariants } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { iconsData } from '$lib/data/icons-data.js';
  import { kebabToPascal } from '$lib/utils/icon-utils.js';
  import IconDisplay from './icon-display.svelte';
  import { cn } from '$lib/utils.js';
  import Fuse from 'fuse.js';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { get, type Readable } from 'svelte/store';
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Virtualizer, VirtualItem as TanVirtualItem } from '@tanstack/virtual-core';

  type IconData = (typeof iconsData)[number];

  type VirtualItem =
    | { type: 'category'; categoryIndex: number }
    | { type: 'row'; categoryIndex: number; rowIndex: number; icons: IconData[] };

  interface Props {
    value?: string | null;
    onValueChange?: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    searchable?: boolean;
    categorized?: boolean;
    class?: string;
    trigger?: Snippet<[{ props: Record<string, unknown> }]>;
  }

  let {
    value = $bindable(null),
    onValueChange,
    placeholder = 'Select an icon',
    searchPlaceholder = 'Search for an icon...',
    searchable = true,
    categorized = true,
    class: className = '',
    trigger
  }: Props = $props();

  let open = $state(false);
  let searchQuery = $state('');
  let scrollContainer = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!open) searchQuery = '';
  });

  const availableIconsData = $derived(iconsData);
  let fuseInstance = $state<Fuse<IconData> | null>(null);

  $effect(() => {
    const data = availableIconsData;
    if (data.length > 0 && !fuseInstance) {
      fuseInstance = new Fuse(data, {
        keys: ['name', 'tags', 'categories'],
        threshold: 0.3,
        ignoreLocation: true
      });
    }
  });

  const filteredIcons = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableIconsData;
    if (!fuseInstance) return availableIconsData;
    return fuseInstance.search(q).map((r) => r.item);
  });

  const categorizedIcons = $derived.by(() => {
    if (!categorized || searchQuery.trim() !== '') {
      return [{ name: 'All Icons', icons: filteredIcons }];
    }
    const categories = new Map<string, IconData[]>();
    for (const icon of filteredIcons) {
      const cats = icon.categories?.length ? icon.categories : ['Other'];
      for (const cat of cats) {
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat)!.push(icon);
      }
    }
    return Array.from(categories.entries())
      .map(([name, icons]) => ({ name, icons }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const virtualItems = $derived.by((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    categorizedIcons.forEach((category, categoryIndex) => {
      items.push({ type: 'category', categoryIndex });
      for (let i = 0; i < category.icons.length; i += 5) {
        items.push({
          type: 'row',
          categoryIndex,
          rowIndex: i / 5,
          icons: category.icons.slice(i, i + 5)
        });
      }
    });
    return items;
  });

  const categoryIndices = $derived.by(() => {
    const indices: Record<string, number> = {};
    virtualItems.forEach((item, index) => {
      if (item.type === 'category') {
        indices[categorizedIcons[item.categoryIndex].name] = index;
      }
    });
    return indices;
  });

  type VStore = Readable<Virtualizer<HTMLDivElement, Element>>;

  // The raw store from createVirtualizer — not reactive itself
  let virtualizerStore: VStore | null = null;
  // Snapshot of rendered virtual items — new array reference on every scroll triggers Svelte reactivity
  let vItems = $state<TanVirtualItem[]>([]);
  let vTotalSize = $state(0);
  let vReady = $state(false);

  // Recreate virtualizer only when the scroll container changes (e.g. picker closes/reopens).
  $effect(() => {
    const el = scrollContainer;
    if (!el) {
      virtualizerStore = null;
      vItems = [];
      vTotalSize = 0;
      vReady = false;
      return;
    }
    let unsub: (() => void) | undefined;
    untrack(() => {
      const store = createVirtualizer({
        count: virtualItems.length,
        getScrollElement: () => el,
        estimateSize: (index) => (virtualItems[index]?.type === 'category' ? 25 : 40),
        overscan: 5,
        gap: 8,
        initialRect: { width: 256, height: 240 }
      }) as unknown as VStore;
      virtualizerStore = store;
      unsub = store.subscribe((v) => {
        // Spread into new array so Svelte detects the change (v is mutated in-place)
        vItems = [...v.getVirtualItems()];
        vTotalSize = v.getTotalSize();
        vReady = true;
      });
    });
    return () => unsub?.();
  });

  // Update count when virtualItems change (search/filter).
  $effect(() => {
    const count = virtualItems.length;
    if (!virtualizerStore) return;
    const v = get(virtualizerStore);
    if (v && v.options.count !== count) {
      (v as any).setOptions({ count, onChange: v.options.onChange });
    }
  });

  // Re-measure when picker opens so virtualizer picks up real container dimensions
  $effect(() => {
    if (open && virtualizerStore) {
      const id = setTimeout(() => {
        const v = get(virtualizerStore!);
        (v as any)?.measure?.();
      }, 50);
      return () => clearTimeout(id);
    }
  });

  const displayValue = $derived(value);

  function handleSelect(icon: IconData) {
    const pascal = kebabToPascal(icon.name);
    value = pascal;
    onValueChange?.(pascal);
    open = false;
  }

  function handleClear() {
    value = null;
    onValueChange?.(null);
    open = false;
  }

  function scrollToCategory(categoryName: string) {
    const idx = categoryIndices[categoryName];
    if (idx !== undefined && virtualizerStore) {
      const v = get(virtualizerStore);
      v?.scrollToIndex(idx, { align: 'start', behavior: 'smooth' });
    }
  }
</script>

<div class={cn('flex items-center gap-2', className)}>
  <Combobox.Root bind:open>
    <Combobox.Trigger>
      {#snippet children({ props: triggerProps }: { props: Record<string, unknown> })}
        {#if trigger}
          {@render trigger({ props: triggerProps })}
        {:else}
          <Button
            {...triggerProps}
            variant="outline"
            class="w-full justify-start gap-2 px-3 text-base md:text-sm"
            role="combobox"
            aria-expanded={open}
          >
            {#if displayValue}
              <IconDisplay name={displayValue} class="size-5 shrink-0" />
              <span class="truncate">{displayValue}</span>
            {:else}
              <span class="text-muted-foreground">{placeholder}</span>
            {/if}
            <ChevronsUpDown class="ml-auto size-4 shrink-0 opacity-50" />
          </Button>
        {/if}
      {/snippet}
    </Combobox.Trigger>
    <Combobox.Content class="min-w-64 py-2">
      {#if searchable}
        <div
          class={cn('flex gap-2 px-2', {
            'mb-2': !categorized || searchQuery.trim() !== ''
          })}
        >
          <Input placeholder={searchPlaceholder} bind:value={searchQuery} />

          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                disabled={!value}
                class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'shrink-0')}
                onclick={handleClear}
              >
                <X class="size-4" />
              </Tooltip.Trigger>
              <Tooltip.Content>Clear icon</Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      {/if}
      {#if categorized && searchQuery.trim() === ''}
        <div class=" flex flex-row gap-1 overflow-x-auto p-2">
          {#each categorizedIcons as { name } (name)}
            <Button
              variant="outline"
              class="shrink-0 text-xs"
              onclick={(e) => {
                e.stopPropagation();
                scrollToCategory(name);
              }}
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Button>
          {/each}
        </div>
      {/if}
      <div bind:this={scrollContainer} class="h-60 max-h-60 overflow-auto px-2">
        {#if filteredIcons.length === 0}
          <div class="py-6 text-center text-sm text-muted-foreground">No icon found</div>
        {:else if vReady}
          <Tooltip.Provider>
            <div class="relative w-full overscroll-contain" style="height: {vTotalSize}px">
              {#each vItems as virtualItem (virtualItem.key ?? virtualItem.index)}
                {@const item = virtualItems[virtualItem.index]}
                {#if item}
                  <div
                    data-category={item.type === 'category'
                      ? categorizedIcons[item.categoryIndex].name
                      : undefined}
                    class:top-0={item.type === 'category'}
                    class:z-10={item.type === 'category'}
                    style="position: absolute; left: 0; width: 100%; height: {virtualItem.size}px; transform: translateY({virtualItem.start}px)"
                  >
                    {#if item.type === 'category'}
                      <h3 class="text-sm font-medium capitalize">
                        {categorizedIcons[item.categoryIndex].name}
                      </h3>
                      <div class="h-px w-full bg-foreground/10"></div>
                    {:else}
                      <div class="grid grid-cols-5 justify-items-center gap-2">
                        {#each item.icons as icon (icon.name)}
                          <Tooltip.Root>
                            <Tooltip.Trigger
                              class={cn(buttonVariants({ variant: 'outline', size: 'icon-lg' }), {
                                'border-accent bg-accent text-accent-foreground':
                                  value === kebabToPascal(icon.name)
                              })}
                              onclick={() => handleSelect(icon)}
                            >
                              <IconDisplay name={kebabToPascal(icon.name)} class="size-5" />
                            </Tooltip.Trigger>
                            <Tooltip.Content>
                              <p>{icon.name}</p>
                            </Tooltip.Content>
                          </Tooltip.Root>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </Tooltip.Provider>
        {/if}
      </div>
    </Combobox.Content>
  </Combobox.Root>
</div>
