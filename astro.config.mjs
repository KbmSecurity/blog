import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://www.kbmsecurity.com.br",
  base: "/blog",

  integrations: [
    mdx(),
    sitemap(),
    tailwind({ applyBaseStyles: false }),
    react(),
  ],

  markdown: {
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },

  // Keep legacy content collections API (type: 'content') working in Astro 5
  // Migration to Content Layer can be done in a future iteration
  legacy: {
    collections: true,
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
