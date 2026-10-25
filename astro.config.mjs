import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/lib/site.mjs';

// Answer keys are for teachers: noindex and left out of the sitemap.
export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: page => !page.endsWith('/404/') && !page.includes('/teachers/answers/') })],
});
