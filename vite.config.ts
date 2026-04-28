import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Alerta apenas para chunks > 500 KB (limiar razoável com lazy loading)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // ── Infraestrutura React ──────────────────────────────────────────
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // ── Auth ─────────────────────────────────────────────────────────
          'auth-vendor': ['@auth0/auth0-react', '@auth0/auth0-spa-js'],

          // ── Mapa (Leaflet) — chunk pesado, isolado para cache de longo prazo
          'leaflet-vendor': ['leaflet', 'react-leaflet'],

          // ── Excel ─────────────────────────────────────────────────────────
          'xlsx-vendor': ['xlsx'],
        },
      },
    },
  },
})
