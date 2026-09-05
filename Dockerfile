# Always-on game server (WebSocket + API) — also serves the built web client.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV STATIC_BASE=/racer-online
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
# Runtime online.json points at this same host (overwritten by platform env if needed)
RUN printf '%s\n' '{"apiBase":"/api","wsUrl":""}' > ./dist/online.json
EXPOSE 8787
CMD ["node", "server/index.mjs"]
