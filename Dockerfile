FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY next.config.js next-env.d.ts postcss.config.js tailwind.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src

RUN npm run build


FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    BACKEND_HOST=127.0.0.1 \
    BACKEND_PORT=8000 \
    AUDIT_API_BASE_URL=http://127.0.0.1:8000 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r backend/requirements.txt && \
    python3 -m playwright install --with-deps chromium

COPY backend ./backend
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
COPY --from=frontend-builder /app/public ./public
COPY start.sh ./start.sh

RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["./start.sh"]
