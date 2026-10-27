import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 10000,
    allowedHosts: [
      'cybercrime-frontend.onrender.com',
      'localhost',
      '.onrender.com', // Allow all Render subdomains
    ],
  },
})
