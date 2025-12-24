
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Vite remplace process.env.API_KEY par la valeur de l'environnement au build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ""),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || "development")
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false
  }
})
