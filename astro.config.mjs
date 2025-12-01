import { defineConfig } from 'astro/config';

export default defineConfig({
  srcDir: 'src',
  site: 'https://archie-on-tour.example',
  server: {
    port: 4321,
  },
});
