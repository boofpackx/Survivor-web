import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative base so the build works at any URL, including GitHub Pages project paths
  base: './',
})
