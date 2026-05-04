<script lang="ts">
  import { IconDisplay } from '$lib/components/ui/icon-picker';
  import { cn } from '$lib/utils';

  let {
    icon,
    color = '#6b7280',
    size = 'md',
    class: className = '',
    iconClass = ''
  }: {
    icon?: string | null;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    iconClass?: string;
  } = $props();
</script>

<div
  class={cn(
    'flex shrink-0 items-center justify-center',
    {
      'size-6 rounded-sm': size === 'sm',
      'size-8 rounded-md': size === 'md',
      'size-10 rounded-lg': size === 'lg'
    },
    className
  )}
  style="background-color: {color}20; border: 1.5px solid {color}40; color: {color}"
>
  <IconDisplay
    name={icon ?? undefined}
    class={cn(
      {
        'size-4': size === 'sm',
        'size-5': size === 'md',
        'size-7': size === 'lg'
      },
      iconClass
    )}
  />
</div>
