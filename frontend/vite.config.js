import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Production Build Optimization ────────────────────────────────────────
  build: {
    outDir: 'dist',

    // No source maps in production — keeps bundle size down and hides source
    sourcemap: false,

    // Warn if any single chunk exceeds 600 KB (helps catch accidental bloat)
    chunkSizeWarningLimit: 600,

    // esbuild is Vite's default — fastest minifier, no extra install needed
    minify: 'esbuild',

    // Inline small assets (<4 KB) as base64 to eliminate HTTP round-trips
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // ── Manual Chunk Splitting ──────────────────────────────────────
        // Splits large vendor libraries into separate chunks so browsers
        // can cache them independently. If only your app code changes,
        // users re-download only the small app chunk — not React or Recharts.
        manualChunks: {
          // Core React runtime — changes very rarely
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Data visualization — Recharts is heavy (~200 KB), isolate it
          'charts-vendor': ['recharts'],

          // UI interaction libraries
          'ui-vendor': [
            'react-toastify',
            'react-select',
            'react-spring',
            'react-easy-crop',
          ],

          // Authentication libraries
          'auth-vendor': ['@react-oauth/google', 'js-cookie', 'react-cookie'],

          // HTTP client
          'http-vendor': ['axios'],

          // SEO library (small, but separate for caching clarity)
          'seo-vendor': ['react-helmet-async'],

          // country-state-city bundles the ENTIRE world geo-database (~16 MB raw).
          // Isolating it means it's downloaded once and cached permanently.
          // Without this, it inflates AccountSettingsII to 8.2 MB.
          'geo-vendor': ['country-state-city'],
        },

        // Content-hashed filenames enable long-term browser caching
        // (Nginx can cache /assets/ for 1 year safely)
        chunkFileNames:  'assets/js/[name]-[hash].js',
        entryFileNames:  'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (/\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|ttf|eot|otf)$/i.test(name)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (/\.css$/i.test(name)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },

  // ── esbuild — Strip console statements in production ─────────────────────
  // Removes all console.log/warn/debug calls from the production bundle.
  // console.error is retained for legitimate runtime error reporting.
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
    pure: mode === 'production' ? ['console.log', 'console.warn', 'console.debug', 'console.info'] : [],
  },

  // ── Development Proxy ─────────────────────────────────────────────────────
  // Forwards API calls to the local Django server during `npm run dev`.
  // This block is entirely ignored during `vite build` — zero production impact.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
