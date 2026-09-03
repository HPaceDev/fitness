# Один образ: собранный фронтенд отдаёт тот же сервер, что и API.

FROM node:22-alpine AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.ts tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /srv
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /srv
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
COPY --from=server-build --chown=app:app /srv/node_modules ./node_modules
COPY --from=server-build --chown=app:app /srv/dist ./dist
COPY --chown=app:app server/drizzle ./drizzle
COPY --chown=app:app server/package.json ./
COPY --from=web --chown=app:app /web/dist ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
