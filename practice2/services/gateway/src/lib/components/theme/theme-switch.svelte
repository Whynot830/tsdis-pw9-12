<script lang="ts">
  import Monitor from '@lucide/svelte/icons/monitor';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import { theme } from './theme.js';
  import { Button } from '$lib/components/ui/button';
  import * as Tooltip from '$lib/components/ui/tooltip';

  let { class: className = '' } = $props();
</script>

<Tooltip.Provider>
  <Tooltip.Root delayDuration={200}>
    <Tooltip.Trigger class={className} onclick={() => theme.toggle()}>
      {#snippet child({ props })}
        <Button variant="ghost" size="icon" {...props}>
          {#if $theme === 'dark'}
            <Moon class="size-5" />
          {:else if $theme === 'light'}
            <Sun class="size-5" />
          {:else}
            <Monitor class="size-5" />
          {/if}
          <span class="sr-only">Toggle theme</span>
        </Button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      {#if $theme === 'dark'}
        Dark
      {:else if $theme === 'light'}
        Light
      {:else}
        System
      {/if}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
