<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import Tags from '@lucide/svelte/icons/tags';
  import ChartColumn from '@lucide/svelte/icons/chart-column';
  import RussianRuble from '@lucide/svelte/icons/russian-ruble';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import LogOut from '@lucide/svelte/icons/log-out';
  import * as Sidebar from '$lib/components/ui/sidebar';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import ThemeSwitch from '$lib/components/theme/theme-switch.svelte';
  import { buttonVariants } from './ui/button';
  import { cn } from '$lib/utils';

  const sidebar = Sidebar.useSidebar();
  let logoutDialogOpen = $state(false);
  let logoutForm = $state<HTMLFormElement | undefined>(undefined);

  const items = [
    { title: 'Home', url: '/', icon: LayoutGrid },
    { title: 'Transactions', url: '/transactions', icon: RussianRuble },
    { title: 'Categories', url: '/categories', icon: Tags },
    { title: 'Analytics', url: '/analytics', icon: ChartColumn }
  ];

  const user = $derived(page.data.user);
</script>

<Sidebar.Root>
  <Sidebar.Header class="border-b px-4 py-3">
    <div class="flex items-center gap-2">
      <div
        class=" flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"
      >
        <span class="text-sm font-bold">₽</span>
      </div>

      <p class="ms-1 font-bold">
        Why<span
          style="color: color-mix(in oklab, var(--color-accent) 60%, var(--color-foreground))"
          >Not</span
        >
        Finances
      </p>
    </div>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each items as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={page.url.pathname === item.url}>
                {#snippet child({ props })}
                  <a
                    href={item.url}
                    {...props}
                    onclick={(e) => {
                      if (page.url.pathname === item.url) e.preventDefault();
                      if (sidebar.isMobile) sidebar.setOpenMobile(false);
                    }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer class="gap-4 border-t px-3">
    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">Theme</span>
      <ThemeSwitch />
    </div>
    {#if user}
      <div class="flex items-center gap-2">
        {#if user.image}
          <img src={user.image} alt={user.name} class="size-7 rounded-full" />
        {:else}
          <div
            class="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
          >
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        {/if}
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{user.name}</p>
          <p class="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <form method="post" action="/logout" use:enhance bind:this={logoutForm}>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                type="button"
                class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                onclick={() => (logoutDialogOpen = true)}
              >
                <LogOut class="size-4" />
              </Tooltip.Trigger>
              <Tooltip.Content>Sign out</Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </form>
        <AlertDialog.Root bind:open={logoutDialogOpen}>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Sign out?</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to sign out of your account?
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action onclick={() => logoutForm?.requestSubmit()}>
                Sign out
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    {/if}
  </Sidebar.Footer>
</Sidebar.Root>
