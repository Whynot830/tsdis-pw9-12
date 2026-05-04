<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Wifi from '@lucide/svelte/icons/wifi';
  import X from '@lucide/svelte/icons/x';

  const { needRefresh, updateServiceWorker, offlineReady } = useRegisterSW({
    onRegistered(r) {
      r &&
        setInterval(
          () => {
            r.update();
          },
          60 * 60 * 1000
        );
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    }
  });

  function close() {
    offlineReady.set(false);
    needRefresh.set(false);
  }

  $: toast = $offlineReady || $needRefresh;
</script>

{#if toast}
  <Card.Root role="alert" class="fixed right-4 bottom-4 z-[9999] w-full max-w-sm">
    <Card.Header class="flex items-center gap-3">
      {#if $offlineReady}
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <Wifi class="size-5" />
        </div>
        <p class="text-sm text-foreground">App ready to work offline</p>
      {:else}
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <RefreshCw class="size-5" />
        </div>
        <p class="text-sm text-foreground">Update available, click reload to update</p>
      {/if}
    </Card.Header>

    <Card.Footer class="flex flex-row justify-end gap-2">
      {#if $needRefresh}
        <Button size="sm" onclick={() => updateServiceWorker(true)}>
          <RefreshCw class="size-3.5" />
          Reload
        </Button>
      {/if}
      <Button size="sm" variant="outline" onclick={close}>
        <X class="size-3.5" />
        Close
      </Button>
    </Card.Footer>
  </Card.Root>
{/if}
