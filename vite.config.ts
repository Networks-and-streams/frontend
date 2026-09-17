import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': '/src',
		},
	},
	server: {
		// Host to bind. The Docker dev stack sets VITE_HOST=0.0.0.0 so the
		// container's Nginx proxy can reach Vite; plain `npm run dev` on the
		// host keeps the loopback-only default (never exposed to the network).
		host: process.env.VITE_HOST || '127.0.0.1',
		port: 5173,
		strictPort: true,
		// Dev-only: accept any Host header. The ngrok public URL is ephemeral,
		// so the allow-list cannot know it in advance. In the container the
		// dev server is only reachable via the internal network + Nginx.
		allowedHosts: true,
		// Forward /api to the backend so plain `npm run dev` works with the
		// same relative /api base URL used behind Nginx/ngrok. The backend has
		// no /api prefix, so it is stripped here (mirrors infra/nginx).
		// Inside Docker the target is the `backend` service (compose sets
		// VITE_API_PROXY_TARGET=http://backend:3000).
		proxy: {
			'/api': {
				target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
		// HMR needs no host/port override: Vite 7's client connects to the
		// page's own origin (same-origin through Nginx and ngrok) and falls
		// back to this server directly on localhost.
	},
});