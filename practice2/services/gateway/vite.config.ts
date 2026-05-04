import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'prompt',
      manifest: {
        name: 'WhyNot Finances',
        short_name: 'Finances',
        description: 'Personal finance tracker',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      devOptions: {
        enabled: false
      },
      workbox: {
        // Корень «/» не в precache; fallback на статический /offline.html (иначе workbox: non-precached-url \"/\").
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ]
});
