import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  // index.html lives at the package root — no custom root needed

  define: {
    // Injected at build time — always matches package.json version
    __APP_VERSION__: JSON.stringify(pkg.version)
  },

  resolve: {
    alias: {
      '@renderer': resolve('src'),
      '@': resolve('src')
    }
  },

  plugins: [react()],

  // Required for Tauri: don't clear the screen in dev mode
  clearScreen: false,

  server: {
    // Tauri expects a fixed port — change this if 1420 conflicts
    port: 1420,
    strictPort: true,
    // HMR over the Tauri window host
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },

  build: {
    // Tauri supports ES2021+ — target it for best compatibility
    target: ['es2021', 'chrome105', 'safari13'],
    // Build output — one level up since root is now the package dir
    outDir: './dist/renderer',
    // Fail on small files warning — not critical for Tauri
    chunkSizeWarningLimit: 1600
  }
})
