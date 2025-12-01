import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

export default defineConfig({
  srcDir: 'src',
  site: 'https://archie-on-tour.example.com',
  output: 'hybrid',
  adapter: node({ mode: 'standalone' })
});
