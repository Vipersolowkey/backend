# Hotel Management & Analytics — Backend

FastAPI, SQLAlchemy, SQLite (mặc định) hoặc PostgreSQL qua `DATABASE_URL`.

## Cài đặt

1. Tạo và kích hoạt virtualenv.
2. Cài dependency:
   ```bash
   pip install -r requirements.txt
   ```
3. Sao chép env:
   ```bash
   cp .env.example .env
   ```
4. **Cơ sở dữ liệu**
   - **SQLite (đơn giản nhất):** trong `.env`, xóa hoặc comment dòng `DATABASE_URL` để app dùng file SQLite mặc định (`backend/test.db`).
   - **PostgreSQL:** giữ `DATABASE_URL` như trong `.env.example`, tạo database và đảm bảo server Postgres đang chạy.

5. Seed dữ liệu (từ thư mục gốc repo, `PYTHONPATH` trỏ vào `backend`):

   **PowerShell**
   ```powershell
   $env:PYTHONPATH = "$PWD\backend"
   python backend/scripts/seed_db.py
   ```

   **bash**
   ```bash
   export PYTHONPATH="$(pwd)/backend"
   python backend/scripts/seed_db.py
   ```

6. Chạy API:

   ```bash
   uvicorn app.main:app --reload --app-dir backend
   ```

## LLM (Groq / Ollama)

- **Groq:** đặt `GROQ_API_KEY`; tùy chọn `GROQ_MODEL=llama-3.3-70b-versatile`, `LLM_PROVIDER=groq`.
- **Ollama local:** chạy Ollama tại `http://127.0.0.1:11434`, cấu hình `OLLAMA_*` phù hợp.
- **Ollama cloud:** `OLLAMA_BASE_URL=https://ollama.com` và `OLLAMA_API_KEY`.
- **`LLM_PROVIDER=auto`:** thử Groq trước, sau đó Ollama.

Không cần Redis cho các luồng hiện tại trong repo này.

## Tài liệu tổng thể

Xem [README.md](../README.md) ở thư mục gốc dự án.
