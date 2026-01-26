import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 1500, // Aumenta limite para 1.5MB (remove warning)
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa bibliotecas grandes em chunks próprios
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'xlsx-vendor': ['xlsx'],
        }
      }
    }
  }
}) 