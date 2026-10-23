import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3333',
      '/health': 'http://127.0.0.1:3333',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'backend/**/*.test.ts',
      'server/**/*.test.ts',
      'shared/**/*.test.ts',
      'worker/**/*.test.ts',
    ],
  },
})
