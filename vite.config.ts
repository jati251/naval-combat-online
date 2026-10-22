import { defineConfig, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

import fs from 'fs';

function mapSavePlugin() {
  return {
    name: 'map-save-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__api/save-map', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer | string) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { mapId, dataUrl } = JSON.parse(body) as { mapId: string; dataUrl: string };
              const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const dir = path.resolve(__dirname, 'public/maps');
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(path.join(dir, `${mapId}_minimap.webp`), buffer);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, file: `${mapId}_minimap.webp` }));
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Unknown error';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: message }));
            }
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mapSavePlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/three/')) return 'vendor-three';
            if (id.includes('/lucide-react/')) return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
