import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { inspectorServer } from '@react-dev-inspector/vite-plugin';
import { inspectorApiPlugin } from './vite-plugin-inspector-api';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react({
        babel: isDev
          ? {
              plugins: ['@react-dev-inspector/babel-plugin'],
            }
          : {},
      }),
      isDev && inspectorServer(),
      isDev && inspectorApiPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      // On ne scanne QUE les tests unitaires du code source.
      // `include` ancré sur src/ exclut d'office les copies de worktree
      // (.claude/worktrees/*/src) et l'outillage gstack (.agents).
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**', // tests/ = E2E Playwright (runner séparé)
        '**/.agents/**', // outillage gstack (bun:test, hors périmètre)
        '**/.claude/**', // worktrees Claude (copies dupliquées)
      ],
      coverage: {
        provider: 'v8',
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/**/*.stories.{ts,tsx}',
          'src/**/*.d.ts',
        ],
      },
    }
  };
});
