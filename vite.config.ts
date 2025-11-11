import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, writeFileSync } from 'fs'

// Garantir que .env existe (mesmo vazio) para o build não falhar
if (!existsSync('.env')) {
  writeFileSync('.env', '# Auto-generated for build\n')
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-utils': ['axios', 'xlsx'],
        },
      },
    },
  },
}) 