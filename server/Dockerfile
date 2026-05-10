FROM node:22-alpine AS builder

WORKDIR /build
COPY package.json package-lock.json ./
COPY server ./server
RUN npm ci -w penguwave-server && npm run build -w penguwave-server

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --omit=dev -w penguwave-server

COPY --from=builder /build/server/dist ./dist
COPY --from=builder /build/server/db ./db
RUN mkdir -p /app/data
COPY data/mock_events.json /app/data/mock_events.json

ENV PORT=3001
ENV EVENTS_JSON_PATH=/app/data/mock_events.json

EXPOSE 3001

CMD ["sh", "-c", "node dist/migrate.js && node dist/seed.js && exec node dist/index.js"]
