<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  let { children } = $props();
  let webManifestLink = $state('');

  const seo = $derived(page.data?.seo ?? { title: 'WhyNot Finances', description: '' });
  const canonicalUrl = $derived(`${page.url.origin}${page.url.pathname}`);

  onMount(async () => {
    const { pwaInfo } = await import('virtual:pwa-info');
    if (pwaInfo?.webManifest?.linkTag) {
      webManifestLink = pwaInfo.webManifest.linkTag;
    }
  });
</script>

<svelte:head>
  <link rel="icon" href="/logo.png" type="image/png" />
  <title>{seo.title}</title>
  <meta name="description" content={seo.description} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={seo.title} />
  <meta property="og:description" content={seo.description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={seo.title} />
  <meta name="twitter:description" content={seo.description} />
  {@html webManifestLink}
</svelte:head>

{@render children()}

{#await import('$lib/ReloadPrompt.svelte') then { default: ReloadPrompt }}
  <ReloadPrompt />
{/await}
