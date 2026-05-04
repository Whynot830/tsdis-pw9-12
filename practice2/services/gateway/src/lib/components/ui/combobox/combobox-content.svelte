<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import * as Drawer from '$lib/components/ui/drawer';
  import { cn } from '$lib/utils.js';
  import { useCombobox } from './context.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
    [key: string]: any;
  }

  let { children, class: className = '', ...props }: Props = $props();

  const combobox = useCombobox();
  const isMobile = $derived.by(() => combobox.isMobile);
</script>

{#if !isMobile}
  <Popover.Content class={cn('w-[200px] p-0', className)} align="start" {...props}>
    {@render children?.()}
  </Popover.Content>
{:else}
  <Drawer.Content {...props}>
    <div class={cn('mt-4 border-t', className)}>
      {@render children?.()}
    </div>
  </Drawer.Content>
{/if}
