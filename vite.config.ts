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
    }
  };
});
