import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

// Port 1420 must match `devUrl` in src-tauri/tauri.conf.json and DEV_PORT in src-tauri/src/main.rs.
export default defineConfig({
    plugins: [react()],
    clearScreen: false,
    server: {port: 1420, strictPort: true, watch: {ignored: ['**/src-tauri/**']}},
    test: {environment: 'jsdom', setupFiles: ['src/test/setup.ts']},
});
