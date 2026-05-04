<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import * as Drawer from '$lib/components/ui/drawer';
  import { useCombobox } from './context.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet<[{ props: Record<string, any> }]>;
    [key: string]: any;
  }

  let { children, ...props }: Props = $props();

  const combobox = useCombobox();
  const isMobile = $derived.by(() => combobox.isMobile);
</script>

{#if !isMobile}
  <Popover.Trigger {...props}>
    {#snippet child(triggerProps)}
      {@render children(triggerProps)}
    {/snippet}
  </Popover.Trigger>
{:else}
  <Drawer.Trigger {...props}>
    {#snippet child(triggerProps)}
      {@render children(triggerProps)}
    {/snippet}
  </Drawer.Trigger>
{/if}
