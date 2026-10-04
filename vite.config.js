import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
