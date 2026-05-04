<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Form from '$lib/components/ui/form';
  import * as Combobox from '$lib/components/ui/combobox';
  import * as Command from '$lib/components/ui/command';
  import * as Popover from '$lib/components/ui/popover';
  import { Calendar } from '$lib/components/ui/calendar';
  import { IconDisplay } from '$lib/components/ui/icon-picker';
  import Check from '@lucide/svelte/icons/check';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { superForm } from 'sveltekit-superforms';
  import { defaults } from 'sveltekit-superforms';
  import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
  import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
  import { toast } from 'svelte-sonner';
  import { cn } from '$lib/utils.js';
  import type { Category, Transaction } from '$lib/types.js';
  import { transactionSchema, type TransactionFormData } from '$lib/schemas/transaction.js';

  let {
    initialData,
    editingTransaction = null,
    categories = [],
    saveTransaction,
    onSaved = () => {},
    onCancel = () => {},
    open = $bindable(false)
  }: {
    initialData: {
      amount: number;
      categoryId: number | null;
      description: string;
      date: string;
    };
    editingTransaction?: Transaction | null;
    categories?: Category[];
    saveTransaction: (data: {
      categoryId: number;
      amount: number;
      description?: string | null;
      createdAt: string;
    }) => Promise<void>;
    onSaved?: () => void | Promise<void>;
    onCancel?: () => void;
    open?: boolean;
  } = $props();

  // superForm инициализируется один раз; при смене initialData компонент пересоздаётся через
  // {#key} в родителе. $effect сбрасывает форму при изменении initialData.
  // svelte-ignore state_referenced_locally
  const form = superForm(defaults(initialData, zod4(transactionSchema)), {
    SPA: true,
    validators: zod4Client(transactionSchema)
  });

  $effect(() => {
    form.reset({ data: initialData });
  });

  const { form: formData, enhance, validateForm } = form;
  let saving = $state(false);
  let catComboOpen = $state(false);
  let calendarOpen = $state(false);

  const selectedCategory = $derived(categories.find((c) => c.id === $formData.categoryId) ?? null);

  const calendarDate = $derived(
    (() => {
      const dateStr = typeof $formData.date === 'string' ? $formData.date : '';
      const [y, m, d] = (dateStr || '').split('-').map(Number);
      if (!y || !m || !d) return today(getLocalTimeZone());
      return new CalendarDate(y, m, d);
    })()
  );

  function setDate(v: { year: number; month: number; day: number }) {
    $formData.date = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = await validateForm({ update: true });
    if (!result.valid) return;

    saving = true;
    try {
      const formValues = $formData as TransactionFormData;
      const dateObj = new Date(String(formValues.date) + 'T12:00:00');
      const payload = {
        categoryId: formValues.categoryId,
        amount: Math.round(formValues.amount * 100),
        description: (formValues.description ?? '')?.trim() || null,
        createdAt: dateObj.toISOString()
      };

      await saveTransaction(payload);
      toast.success(editingTransaction ? 'Transaction updated' : 'Expense added');
      open = false;
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      saving = false;
    }
  }
</script>

<form method="POST" use:enhance class="space-y-4" onsubmit={handleSubmit}>
  <Form.Field {form} name="amount">
    {#snippet children({ constraints, errors, tainted, value })}
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Amount (₽) *</Form.Label>
          <Input
            {...props}
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            bind:value={$formData.amount}
            placeholder="0.00"
            class="text-lg font-semibold"
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    {/snippet}
  </Form.Field>

  <Form.Field {form} name="categoryId">
    {#snippet children({ constraints, errors, tainted, value })}
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Category *</Form.Label>
          <Combobox.Root bind:open={catComboOpen}>
            <Combobox.Trigger>
              {#snippet children({ props: triggerProps }: { props: Record<string, unknown> })}
                <Button
                  {...props}
                  {...triggerProps}
                  variant="outline"
                  class="w-full justify-between"
                  role="combobox"
                  aria-expanded={catComboOpen}
                >
                  {#if selectedCategory}
                    <span class="flex items-center gap-2">
                      <IconDisplay name={selectedCategory.icon ?? undefined} />
                      {selectedCategory.name}
                    </span>
                  {:else}
                    <span class="text-muted-foreground">Select a category...</span>
                  {/if}
                  <ChevronsUpDown class="ml-2 shrink-0 opacity-50" />
                </Button>
              {/snippet}
            </Combobox.Trigger>
            <Combobox.Content>
              <Command.Root class="max-md:rounded-none">
                <Command.Input placeholder="Search categories..." />
                <Command.List>
                  <Command.Empty>No categories found</Command.Empty>
                  <Command.Group>
                    {#each categories as cat (cat.id)}
                      <Command.Item
                        value={cat.name}
                        onSelect={() => {
                          $formData.categoryId = cat.id;
                          catComboOpen = false;
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
                            $formData.categoryId !== cat.id && 'text-transparent'
                          )}
                        />
                      </Command.Item>
                    {/each}
                  </Command.Group>
                </Command.List>
              </Command.Root>
            </Combobox.Content>
          </Combobox.Root>
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    {/snippet}
  </Form.Field>

  <Form.Field {form} name="date">
    {#snippet children({ constraints, errors, tainted, value })}
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Date</Form.Label>
          <Popover.Root bind:open={calendarOpen}>
            <Popover.Trigger>
              {#snippet child({ props: triggerProps })}
                <Button {...props} {...triggerProps} variant="outline" class="w-full justify-start">
                  <CalendarIcon />
                  {new Intl.DateTimeFormat('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }).format(calendarDate.toDate(getLocalTimeZone()))}
                </Button>
              {/snippet}
            </Popover.Trigger>
            <Popover.Content class="w-auto p-0" align="start">
              <Calendar
                type="single"
                value={calendarDate}
                onValueChange={(v) =>
                  v && setDate(v as { year: number; month: number; day: number })}
                captionLayout="dropdown"
              />
            </Popover.Content>
          </Popover.Root>
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    {/snippet}
  </Form.Field>

  <Form.Field {form} name="description">
    {#snippet children({ constraints, errors, tainted, value })}
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Description (optional)</Form.Label>
          <Textarea
            {...props}
            bind:value={$formData.description as string}
            placeholder="Add a note..."
            rows={2}
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    {/snippet}
  </Form.Field>

  <Dialog.Footer class="gap-2">
    <Button
      type="button"
      variant="outline"
      onclick={() => {
        open = false;
        onCancel();
      }}
    >
      Cancel
    </Button>
    <Button type="submit" disabled={saving}>
      {#if saving}
        <Loader2 class="animate-spin" />
      {/if}
      {editingTransaction ? 'Save' : 'Add'}
    </Button>
  </Dialog.Footer>
</form>
