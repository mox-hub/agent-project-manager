import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    main: 'electron/src/main.ts',
    preload: 'electron/src/preload.ts',
  },
  outDir: 'electron/dist',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
  clean: true,
});
