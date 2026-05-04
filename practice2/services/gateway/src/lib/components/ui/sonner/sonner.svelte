<script lang="ts">
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import Info from '@lucide/svelte/icons/info';
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import OctagonX from '@lucide/svelte/icons/octagon-x';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

  import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
  import { theme } from '$lib/components/theme/theme.js';

  let { ...restProps }: SonnerProps = $props();

  const sonnerTheme = $derived($theme === 'system' ? 'system' : $theme);
</script>

<Sonner
  theme={sonnerTheme}
  class="toaster group"
  style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
  {...restProps}
  >{#snippet loadingIcon()}
    <Loader2 class="size-4 animate-spin" />
  {/snippet}
  {#snippet successIcon()}
    <CircleCheck class="size-4" />
  {/snippet}
  {#snippet errorIcon()}
    <OctagonX class="size-4" />
  {/snippet}
  {#snippet infoIcon()}
    <Info class="size-4" />
  {/snippet}
  {#snippet warningIcon()}
    <TriangleAlert class="size-4" />
  {/snippet}
</Sonner>
