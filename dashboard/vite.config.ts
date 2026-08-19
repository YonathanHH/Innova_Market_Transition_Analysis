import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Root-relative by default, which is what Vercel (and `npm run dev`) serve.
// GitHub Pages serves from /<repo>/ instead, so its workflow passes VITE_BASE.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  build: { outDir: 'dist', sourcemap: false },
})
