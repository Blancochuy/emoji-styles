FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/react/package.json packages/react/
COPY packages/assets-twemoji/package.json packages/assets-twemoji/
COPY demo/package.json demo/
RUN pnpm install --frozen-lockfile
COPY packages/core/ packages/core/
COPY packages/react/ packages/react/
COPY packages/assets-twemoji/ packages/assets-twemoji/
COPY demo/ demo/
RUN pnpm --filter emoji-styles build && pnpm --filter react-emoji-styles build && pnpm --filter emoji-styles-assets-twemoji build && pnpm --filter emoji-styles-demo build

FROM nginx:alpine
COPY --from=builder /app/demo/dist /usr/share/nginx/html
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
