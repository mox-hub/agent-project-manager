import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeHighlight from 'rehype-highlight'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
        rehypeHighlight,
      ],
      providerImportSource: '@mdx-js/react',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/lang-markdown',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/autocomplete',
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/_api': {
        // worktree 并行场景用 VITE_API_PORT 指向隔离后端（默认 4300）；
        // 用 127.0.0.1 而非 localhost——Node 17+ 下 localhost 优先解析 IPv6，
        // server 只绑 IPv4 时 proxy 会 socket hang up
        target: `http://127.0.0.1:${process.env.VITE_API_PORT ?? 4300}`,
        changeOrigin: true,
      },
    },
  },
})
