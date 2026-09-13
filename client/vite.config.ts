import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  build: {
    // The server serves ./public statically, so the client bundle lands there.
    outDir: path.resolve(here, '../public'),
    emptyOutDir: true,
  },
});
