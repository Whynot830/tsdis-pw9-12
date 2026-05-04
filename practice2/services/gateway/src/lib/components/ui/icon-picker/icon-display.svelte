<script lang="ts">
  import Box from '@lucide/svelte/icons/box';
  import { pascalToKebab } from '$lib/utils/icon-utils.js';
  import type { Component } from 'svelte';

  const iconModules = import.meta.glob<{ default: Component<{ class?: string }> }>(
    '/node_modules/@lucide/svelte/dist/icons/*.js',
    { eager: false }
  );

  interface Props {
    name?: string | null;
    class?: string;
  }

  let { name, class: className = '' }: Props = $props();

  let IconComponent = $state<Component<{ class?: string }>>(Box);

  $effect(() => {
    const n = name;
    IconComponent = Box;

    if (!n) return;

    const kebab = pascalToKebab(n);
    const key = `/node_modules/@lucide/svelte/dist/icons/${kebab}.js`;
    const loader = iconModules[key];

    if (!loader) return;

    loader()
      .then((m) => {
        if (name === n) IconComponent = m.default;
      })
      .catch((e) => {
        console.error(e);
        if (name === n) IconComponent = Box;
      });
  });
</script>

<IconComponent class={className} />
