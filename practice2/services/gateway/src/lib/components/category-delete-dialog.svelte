<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import type { Category } from '$lib/types';
  import { buttonVariants } from './ui/button';

  let {
    open = $bindable(false),
    category = null,
    onConfirm = () => {},
    onCancel = () => {}
  }: {
    open?: boolean;
    category?: Category | null;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  } = $props();

  let deleting = $state(false);

  async function handleConfirm() {
    if (!category) return;
    deleting = true;
    try {
      await onConfirm();
    } finally {
      deleting = false;
    }
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete category?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if category}
          The category "{category.name}" will be permanently deleted. This action cannot be undone.
          Categories with existing transactions cannot be deleted.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={onCancel}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleConfirm}
        class={buttonVariants({ variant: 'destructive', size: 'sm' })}
      >
        {#if deleting}
          <Loader2 class="mr-2 animate-spin" />
        {/if}
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
