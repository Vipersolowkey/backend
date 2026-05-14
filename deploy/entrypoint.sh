#!/bin/sh
set -e
# SQLite DATABASE_URL like sqlite:////data/app.db needs /data to exist (Render has no volume unless attached).
mkdir -p /data

cd /app/backend
export PYTHONPATH=/app/backend

# Optional: seed SQLite demo DB when empty (Render free has no Shell for one-off scripts).
python scripts/render_auto_seed.py

nginx

exec uvicorn app.main:app --host 127.0.0.1 --port 8000
