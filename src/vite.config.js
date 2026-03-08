import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — cached aggressively by browser
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Axios — separate so it's cached independently
          'vendor-axios': ['axios'],
        }
      }
    },
    // Compress output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // removes all console.log in production
        drop_debugger: true,
      }
    },
    chunkSizeWarningLimit: 500,
  }
})
