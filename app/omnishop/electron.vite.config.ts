import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig({
  main: {
    build: {
      // For some reason, electron-vite seems to have trouble resolving
      // the electron dependency on its own.
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  preload: {},
  renderer: {
    define: {
      // Injected at build time — always matches package.json version
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
