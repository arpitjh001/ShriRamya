import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        resolve: {
            alias: {
                "@": path.resolve(process.cwd(), "./src"),
            },
        },
        plugins: [react()],
        esbuild: {
            loader: "jsx",
            include: /src\/.*\.jsx?$/,
            exclude: [],
        },
        optimizeDeps: {
            esbuildOptions: {
                plugins: [
                    {
                        name: "load-js-files-as-jsx",
                        setup(build) {
                            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
                                loader: "jsx",
                                contents: await fs.promises.readFile(args.path, "utf8"),
                            }));
                        },
                    },
                ],
            },
        },
        server: {
            port: 3000,
        },
        build: {
            outDir: 'dist',
            // Chunk size warning limit - 800 KB
            chunkSizeWarningLimit: 800,
            // Enable source maps for production debugging
            sourcemap: mode === 'production',
            // Minify with esbuild for faster builds
            minify: 'esbuild',
            // Split vendor bundles and code chunks
            rollupOptions: {
                output: {
                    // Manual chunk splitting for vendor bundles
                    manualChunks: {
                        // React vendor chunk
                        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                        // UI libraries chunk
                        'ui-vendor': [
                            '@radix-ui/react-accordion',
                            '@radix-ui/react-dialog',
                            '@radix-ui/react-dropdown-menu',
                            '@radix-ui/react-select',
                            '@radix-ui/react-tabs',
                            '@radix-ui/react-toast',
                            '@radix-ui/react-tooltip',
                        ],
                        // Charts and visualization
                        'charts-vendor': ['recharts'],
                        // Animation library
                        'animation-vendor': ['framer-motion'],
                        // Form handling
                        'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
                        // Utilities
                        'utils-vendor': ['axios', 'dayjs', 'clsx', 'tailwind-merge'],
                    },
                    // Asset naming with content hash for cache busting
                    entryFileNames: 'assets/[name]-[hash].js',
                    chunkFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash].[ext]',
                },
            },
            // Target modern browsers for smaller bundles
            target: 'esnext',
        },
        define: {
            'process.env.REACT_APP_BACKEND_URL': JSON.stringify(env.REACT_APP_BACKEND_URL),
            'process.env.PUBLIC_URL': JSON.stringify('')
        }
    };
});
