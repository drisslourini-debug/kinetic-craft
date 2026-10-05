import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Ensure local .env and .env.local are guaranteed in process.env for local serverless middlewares
function loadLocalEnv() {
  for (const envFile of ['.env', '.env.local']) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [k, ...v] = trimmed.split('=');
          const key = k.trim();
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key] || process.env[key] === '') {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadLocalEnv();

function serverlessDevPlugin() {
  return {
    name: 'serverless-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url?.startsWith('/api/')) {
          return next();
        }
        (async () => {
          try {
            if (url === '/api/ai/scan-receipt') {
              const mod = await import('./api/ai/scan-receipt.js');
              await mod.default(req, res);
              return;
            }
            if (url === '/api/ai/voice-parse') {
              const mod = await import('./api/ai/voice-parse.js');
              await mod.default(req, res);
              return;
            }
            if (url === '/api/calendar' || url === '/api/calendar.ics') {
              const mod = await import('./api/calendar.js');
              await mod.default(req, res);
              return;
            }
            next();
          } catch (err) {
            console.error('Local API dev server error:', err);
            if (!res.headersSent && !res.writableEnded) {
              try {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Server error' }));
              } catch {}
            }
          }
        })().catch((unhandled) => {
          console.error('Unhandled API error in dev server:', unhandled);
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), serverlessDevPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('swissqrbill')) {
              return 'vendor-qr'
            }
            if (id.includes('html2pdf.js') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf'
            }
            if (id.includes('docx')) {
              return 'vendor-docx'
            }
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/zefix': {
        target: 'https://www.zefix.admin.ch/ZefixPublicREST',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zefix/, ''),
      },
    },
  },
})
