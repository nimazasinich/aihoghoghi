import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        pretendToBeVisual: true,
        url: 'http://localhost',
        // Enhanced Persian text support
        beforeParse(window) {
          // Mock Persian text rendering
          window.Intl = window.Intl || {};
          window.Intl.Locale = window.Intl.Locale || class Locale {};
          // Mock RTL support
          window.getComputedStyle = window.getComputedStyle || (() => ({
            direction: 'rtl',
            textAlign: 'right'
          }));
        }
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      // Enhanced coverage reporting
      all: true,
      skipFull: false
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    teardownTimeout: 15000,
    // Enhanced test configuration
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'coverage'
    ],
    // Performance testing
    benchmark: {
      include: ['src/**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@types': resolve(__dirname, './src/types'),
      '@test': resolve(__dirname, './src/test'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  // Enhanced build configuration for testing
  define: {
    'import.meta.env.VITEST': 'true'
  }
});