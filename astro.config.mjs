import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cosmos.aguidetocloud.com',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  compressHTML: true,
  trailingSlash: 'ignore',
  vite: {
    build: {
      cssMinify: 'esbuild',
    },
  },
});
