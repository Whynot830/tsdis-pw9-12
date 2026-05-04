<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import * as Sidebar from '$lib/components/ui/sidebar';
  import AppSidebar from '$lib/components/app-sidebar.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import { Button } from '$lib/components/ui/button';
  import { Spinner } from '$lib/components/ui/spinner';
  import { headerExtras, openAddExpense, openAddCategory } from '$lib/stores/header-store';
  import { formatAmount } from '$lib/utils/format';
  import Plus from '@lucide/svelte/icons/plus';
  import '../../styles/app.css';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 30 * 60 * 1000
      }
    }
  });

  let { children } = $props();

  const pageTitles: Record<string, string> = {
    '/': 'Expenses',
    '/transactions': 'Transactions',
    '/categories': 'Categories',
    '/analytics': 'Analytics'
  };
  const pageTitle = $derived(pageTitles[page.url.pathname] ?? 'Finances');
  const isHome = $derived(page.url.pathname === '/');
  const isCategories = $derived(page.url.pathname === '/categories');
</script>

<QueryClientProvider client={queryClient}>
  <Sidebar.Provider class="h-dvh min-h-0 overflow-hidden">
    <AppSidebar />
    <Sidebar.Inset class="min-h-0">
      <Toaster richColors position="top-center" />
      <header class="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <Sidebar.Trigger class="-ml-1" />
        <h1 class="text-lg font-semibold">{pageTitle}</h1>
        {#if isHome}
          {@const extras = $headerExtras}
          <div class="ml-auto flex items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-muted-foreground">This month</span>
              {#if extras.loading}
                <Spinner class="size-5" />
              {:else}
                <span class="font-semibold">{formatAmount(extras.thisMonth ?? 0)}</span>
              {/if}
            </div>
            {#if extras.showAddButton}
              <Button size="sm" onclick={() => openAddExpense.set(true)}>
                <Plus />
                <span class="hidden sm:max-md:inline"> Add </span>
                <span class="hidden md:inline"> Add expense </span>
              </Button>
            {/if}
          </div>
        {/if}
        {#if isCategories}
          <div class="ml-auto">
            <Button size="sm" onclick={() => openAddCategory.set(true)}>
              <Plus />
              <span class="hidden sm:max-md:inline"> Add </span>
              <span class="hidden md:inline"> Add category </span>
            </Button>
          </div>
        {/if}
      </header>
      <main class="min-h-0 flex-1 overflow-auto">
        {@render children()}
      </main>
    </Sidebar.Inset>
  </Sidebar.Provider>
</QueryClientProvider>

<svelte:head>
  <!-- Apply theme before render to prevent flash -->
  {@html `<script>(function(){var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');})()</script>`}
</svelte:head>
