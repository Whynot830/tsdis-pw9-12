<script lang="ts">
  import { categoriesApi, type CreateCategoryInput } from '$lib/api';
  import { createDeleteCategoryHandler } from '$lib/actions/categories';
  import { PRESET_COLORS } from '$lib/constants/colors';
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import * as Empty from '$lib/components/ui/empty';
  import { IconPicker } from '$lib/components/ui/icon-picker';
  import CategoryIcon from '$lib/components/category-icon.svelte';
  import { createSvelteTable, FlexRender, TablePagination } from '$lib/components/ui/data-table';
  import { createColumnHelper, getCoreRowModel, getPaginationRowModel } from '@tanstack/table-core';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Tags from '@lucide/svelte/icons/tags';
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { readableColor } from '$lib/utils.js';
  import { toast } from 'svelte-sonner';
  import { superForm } from 'sveltekit-superforms';
  import { defaults } from 'sveltekit-superforms';
  import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
  import { categorySchema, type CategoryFormData } from '$lib/schemas/category.js';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { beforeNavigate } from '$app/navigation';
  import { openAddCategory } from '$lib/stores/header-store';
  import type { Category } from '$lib/types';
  import CategoryDeleteDialog from '$lib/components/category-delete-dialog.svelte';
  import { cn } from '$lib/utils';
  const categoriesQuery = categoriesApi.queries.useCategoriesList();
  const createCategoryMutation = categoriesApi.mutations.useCreateCategory();
  const updateCategoryMutation = categoriesApi.mutations.useUpdateCategory();
  const deleteCategoryMutation = categoriesApi.mutations.useDeleteCategory();

  const categories = $derived(categoriesQuery.data ?? []);
  const loading = $derived(categoriesQuery.isPending);
  let saving = $state(false);

  let dialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let editingCategory = $state<Category | null>(null);
  let deletingCategory = $state<Category | null>(null);

  let pagination = $state({ pageIndex: 0, pageSize: 15 });

  function getInitialData(cat: Category | null) {
    if (cat) return { name: cat.name, icon: cat.icon, color: cat.color };
    return { name: '', icon: null as string | null, color: '#6b7280' };
  }

  const form = superForm(defaults(getInitialData(null), zod4(categorySchema)), {
    SPA: true,
    validators: zod4Client(categorySchema)
  });
  const { form: formData, enhance, validateForm } = form;

  function openCreate() {
    editingCategory = null;
    form.reset({ data: getInitialData(null) });
    dialogOpen = true;
  }

  function openEdit(cat: Category) {
    editingCategory = cat;
    form.reset({ data: getInitialData(cat) });
    dialogOpen = true;
  }

  function openDelete(cat: Category) {
    deletingCategory = cat;
    deleteDialogOpen = true;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const result = await validateForm({ update: true });
    if (!result.valid) return;

    const formValues = $formData as CategoryFormData;
    const duplicate = categories.find(
      (c) =>
        c.name.toLowerCase() === formValues.name.trim().toLowerCase() &&
        c.id !== editingCategory?.id
    );
    if (duplicate) {
      toast.error('A category with this name already exists');
      return;
    }

    saving = true;
    try {
      const payload: CreateCategoryInput = {
        name: formValues.name.trim(),
        icon: formValues.icon,
        color: formValues.color
      };

      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ ...payload, id: editingCategory.id });
      } else {
        await createCategoryMutation.mutateAsync(payload);
      }
      toast.success(editingCategory ? 'Category updated' : 'Category created');
      dialogOpen = false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      saving = false;
    }
  }

  const deleteCategory = createDeleteCategoryHandler(deleteCategoryMutation, {
    onSuccess: () => {
      deleteDialogOpen = false;
      deletingCategory = null;
    }
  });

  const colHelper = createColumnHelper<Category>();
  const columns = [
    colHelper.accessor('name', { header: 'Name' }),
    colHelper.accessor((row) => row, {
      id: 'icon',
      header: 'Icon',
      cell: (info) => {
        const cat = info.getValue();
        return { icon: cat.icon, color: cat.color };
      }
    }),
    colHelper.accessor('color', { header: 'Color' }),
    colHelper.display({ id: 'actions', header: '', cell: () => null })
  ];

  const table = createSvelteTable({
    get data() {
      return categories;
    },
    columns,
    state: {
      get pagination() {
        return pagination;
      }
    },
    onPaginationChange: (updater) => {
      pagination = typeof updater === 'function' ? updater(pagination) : pagination;
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  $effect(() => {
    if ($openAddCategory) {
      openCreate();
      openAddCategory.set(false);
    }
  });

  beforeNavigate(({ from }) => {
    if (from?.url.pathname === '/categories') {
      openAddCategory.set(false);
    }
  });
</script>

<div class="flex h-full flex-col sm:p-4 md:p-6">
  {#if loading}
    <Skeleton class="flex-1" />
  {:else if categories.length === 0}
    <Empty.Root class="border-2 border-dashed">
      <Empty.Media variant="icon">
        <Tags />
      </Empty.Media>
      <Empty.Header>
        <Empty.Title>No categories yet</Empty.Title>
        <Empty.Description>Create your first category to start tracking expenses</Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button onclick={openCreate}>
          <Plus />
          Add category
        </Button>
      </Empty.Content>
    </Empty.Root>
  {:else}
    <Card.Root class="flex min-h-0 flex-1 flex-col gap-4.5 max-sm:rounded-none">
      <Card.Content class="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 z-10 border-b bg-muted">
              {#each table.getHeaderGroups() as headerGroup}
                <tr>
                  {#each headerGroup.headers as header}
                    <th
                      class="px-3 py-2 font-medium text-muted-foreground md:px-4 md:py-3 {header
                        .column.id === 'icon'
                        ? 'text-center'
                        : 'text-left'}"
                    >
                      {#if !header.isPlaceholder}
                        <FlexRender
                          content={header.column.columnDef.header}
                          context={header.getContext()}
                        />
                      {/if}
                    </th>
                  {/each}
                </tr>
              {/each}
            </thead>
            <tbody>
              {#each table.getRowModel().rows as row (row.id)}
                {@const cat = row.original}
                <tr class="border-b transition-colors hover:bg-muted/30">
                  {#each row.getVisibleCells() as cell}
                    <td
                      class="px-3 py-2 font-medium md:px-4 md:py-3 {cell.column.id === 'icon'
                        ? 'text-center'
                        : ''}"
                    >
                      {#if cell.column.id === 'name'}
                        {cat.name}
                      {:else if cell.column.id === 'icon'}
                        <div class="flex justify-center">
                          <CategoryIcon icon={cat.icon} color={cat.color} size="lg" />
                        </div>
                      {:else if cell.column.id === 'color'}
                        <div class="flex items-center gap-2">
                          <div
                            class="size-4 shrink-0 rounded-full"
                            style="background-color: {cat.color}"
                          ></div>
                          <span class="font-mono text-sm font-medium text-muted-foreground"
                            >{cat.color}</span
                          >
                        </div>
                      {:else if cell.column.id === 'actions'}
                        <div class="flex justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            onclick={() => openEdit(cat)}
                            aria-label="Edit category"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onclick={() => openDelete(cat)}
                            aria-label="Delete category"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      {:else}
                        <FlexRender
                          content={cell.column.columnDef.cell}
                          context={cell.getContext()}
                        />
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <TablePagination {table} itemLabel="categories" />
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>{editingCategory ? 'Edit category' : 'New category'}</Dialog.Title>
      <Dialog.Description>
        {editingCategory
          ? 'Update the category details'
          : 'Fill in the details for your new category'}
      </Dialog.Description>
    </Dialog.Header>

    <form method="POST" use:enhance class="space-y-4" onsubmit={handleSubmit}>
      <Form.Field {form} name="name">
        {#snippet children({ constraints, errors, tainted, value })}
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Name *</Form.Label>
              <Input {...props} bind:value={$formData.name} placeholder="e.g. Groceries" />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        {/snippet}
      </Form.Field>

      <Form.Field {form} name="icon">
        {#snippet children({ constraints, errors, tainted, value })}
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Icon (optional)</Form.Label>
              <div class="flex-1" {...props}>
                <IconPicker
                  bind:value={$formData.icon as string | null}
                  placeholder="Select an icon"
                  searchPlaceholder="Search icons..."
                />
              </div>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        {/snippet}
      </Form.Field>

      <Form.Field {form} name="color">
        {#snippet children({ constraints, errors, tainted, value })}
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Color *</Form.Label>
              <div class="flex flex-wrap items-center gap-2" {...props}>
                {#each PRESET_COLORS as color}
                  <button
                    type="button"
                    aria-label="Select color {color}"
                    class="size-7 rounded-full border-2 transition-transform hover:scale-110"
                    style="background-color: {color}; border-color: {$formData.color === color
                      ? color
                      : 'transparent'}"
                    onclick={() => ($formData.color = color)}
                  ></button>
                {/each}
                <div class="flex items-center gap-2">
                  <div
                    class="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full transition-transform hover:scale-110"
                  >
                    <div
                      class="absolute inset-0 rounded-full"
                      style="background-color: {$formData.color}"
                    ></div>
                    <input
                      type="color"
                      bind:value={$formData.color}
                      class="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                  </div>
                  <span class="font-mono text-xs text-muted-foreground">{$formData.color}</span>
                </div>
              </div>
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        {/snippet}
      </Form.Field>

      <div class="rounded-lg border bg-muted/30 p-3">
        <p class="mb-2 text-xs text-muted-foreground">Preview</p>
        <div class="flex items-center gap-2">
          <CategoryIcon icon={$formData.icon} color={$formData.color} />
          <Badge
            style="background-color: {$formData.color}; color: {readableColor($formData.color)};
              border: none"
          >
            {$formData.name || 'Name'}
          </Badge>
        </div>
      </div>

      <Dialog.Footer class="gap-2">
        <Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {#if saving}
            <Loader2 class="animate-spin" />
          {/if}
          {editingCategory ? 'Save' : 'Create'}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<CategoryDeleteDialog
  bind:open={deleteDialogOpen}
  category={deletingCategory}
  onConfirm={() => {
    if (deletingCategory) deleteCategory(deletingCategory);
  }}
  onCancel={() => (deletingCategory = null)}
/>
