import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Optimized dependency pre-bundling
  optimizeDeps: {
    include: [
      '@supabase/supabase-js',
      '@tremor/react',
      'framer-motion',
      'recharts'
    ],
    exclude: ['lucide-react']  // Exclude lucide-react from pre-bundling due to dynamic imports
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    
    // HMR configuration with overlay enabled for dev
    hmr: {
      overlay: true,  // Full overlay kept ON in dev
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    
    // Future-ready headers for WebTransport/WebRTC
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    
    proxy: {
      // WebSocket route (MUST match backend route)
      '/ws/unified': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('WS proxy error:', err));
          proxy.on('upgrade', () => console.log('WS upgrade ok'));
        },
      },
      
      // API route with keep-alive optimization
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Keep-Alive', 'timeout=60');
          });
        },
      },
    },
    
    // Optimized file watching
    watch: {
      ignored: ['**/node_modules/**', '**/backend/**', '**/.git/**', '**/dist/**'],
    },
  },
  
  // Build optimizations
  build: {
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@tremor/react', 'framer-motion', 'lucide-react'],
          'charts-vendor': ['recharts'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
    
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Source maps for production debugging (hidden to reduce size)
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,
  },
});