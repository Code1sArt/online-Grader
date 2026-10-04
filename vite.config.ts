import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Only this PUBLIC OAuth ID is forwarded. Database/JWT secrets never enter the bundle.
  const clientId =
    env.VITE_GOOGLE_CLIENT_ID ||
    (mode === 'development'
      ? loadEnv(mode, resolve(process.cwd(), '../grader-api'), 'GOOGLE_CLIENT_ID').GOOGLE_CLIENT_ID
      : '') ||
    '';
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/node_modules\/@codemirror\/(state|view)\//.test(id.replace(/\\/g, '/')))
              return 'editor-core';
          },
        },
      },
    },
    define: { 'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(clientId) },
    server: {
      port: 5173,
      strictPort: true,
      // Google Identity Services may communicate with a non-FedCM popup.
      // Keep the popup opener relationship without disabling COOP entirely.
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:3100', changeOrigin: true } },
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
  };
});
