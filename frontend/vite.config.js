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
        },
        define: {
            'process.env.REACT_APP_BACKEND_URL': JSON.stringify(env.REACT_APP_BACKEND_URL),
            'process.env.PUBLIC_URL': JSON.stringify('')
        }
    };
});
