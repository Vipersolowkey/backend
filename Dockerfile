# Single image: Nginx (port 80) serves the Vite SPA and proxies /api/* to Uvicorn on :8000.
# Build frontend with VITE_API_BASE_URL=/api/v1 so the browser calls same origin (no CORS).

FROM node:20-alpine AS frontend-build
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default \
    && mkdir -p /data

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
# seed_db.py reads CSV from PROJECT_DIR=/app (parents[2] of scripts/seed_db.py)
COPY *.csv /app/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=frontend-build /fe/dist /usr/share/nginx/html

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
