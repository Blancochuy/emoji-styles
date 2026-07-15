FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace config first for proper monorepo resolution
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/react/package.json ./packages/react/
COPY packages/assets-twemoji/package.json ./packages/assets-twemoji/
COPY demo/package.json ./demo/

RUN corepack enable && pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY demo/ ./demo/
COPY tsconfig.base.json ./

# Build everything
RUN pnpm -r build

# Only copy demo dist to nginx
FROM nginx:alpine
COPY --from=builder /app/demo/dist /usr/share/nginx/html
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
