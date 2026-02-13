import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8080,
    // Disable HTTPS for Cloud9 development
    // https: {},
    allowedHosts: [
      '10b3cbfb21044a2e89d3f278154cbf0f.vfs.cloud9.us-west-2.amazonaws.com',
      'localhost',
      '.amazonaws.com'
    ],
  },
  base: '/kdm/manager/',
  plugins: [react()], // Remove basicSsl for Cloud9
  // plugins: [react(), basicSsl()], // Use this for production with HTTPS
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
})
