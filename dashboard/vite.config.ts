import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://<user>.github.io/Innova_Market_Transition_Analysis/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/Innova_Market_Transition_Analysis/',
  build: { outDir: 'dist', sourcemap: false },
})
