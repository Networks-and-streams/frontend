# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Graph Resolver frontend (React + Vite).
#
# Two build targets used by infra/docker:
#   target: development  → Vite dev server (0.0.0.0:5173) with HMR through Nginx
#   target: production   → `tsc -b && vite build` output served by Nginx (SPA)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS base
WORKDIR /app

# ── Dependencies (shared by every target) ────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── Development image (compose.dev.yml) ───────────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 5173
# VITE_HOST / VITE_API_PROXY_TARGET come from Compose (see infra/docker).
CMD ["npm", "run", "dev"]

# ── Production build ─────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN npm run build

# ── Production image: static assets served by Nginx (SPA fallback) ──────────
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]