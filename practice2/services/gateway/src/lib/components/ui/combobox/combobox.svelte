<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type ComboboxRootProps = {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: Snippet;
  };
</script>

<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import * as Drawer from '$lib/components/ui/drawer';
  import { setCombobox } from './context.svelte.js';

  let { open = $bindable(false), onOpenChange, children }: ComboboxRootProps = $props();

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }

  const combobox = setCombobox({
    open: () => open,
    setOpen: handleOpenChange
  });

  const isMobile = $derived.by(() => combobox.isMobile);
</script>

{#if !isMobile}
  <Popover.Root {open} onOpenChange={handleOpenChange}>
    {@render children()}
  </Popover.Root>
{:else}
  <Drawer.Root {open} onOpenChange={handleOpenChange}>
    {@render children()}
  </Drawer.Root>
{/if}
