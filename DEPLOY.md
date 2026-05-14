# Triển khai bản web dùng được (UEL / Hotel demo)

**Khuyến nghị:** (C) **Render Blueprint** — một URL HTTPS, Docker đúng như thiết kế repo (UI + `/api` cùng domain). (A) **Docker cục bộ / VPS** giống (C) nhưng tự host. (B) **Tách Vercel + API** chỉ khi bạn chủ động muốn tách pipeline / tên miền.

---

## A. Docker (khuyến nghị cho “lên một link là xài”)

### Cách hoạt động

- **Nginx** (cổng 80): phục vụ file tĩnh React và chuyển mọi request `/api/...` sang **FastAPI** (Uvicorn nội bộ cổng 8000).
- Frontend build với `VITE_API_BASE_URL=/api/v1` → trình duyệt gọi **cùng domain** → không cần cấu hình CORS phức tạp.

### Chạy trên máy có Docker

```bash
# Từ thư mục gốc repo (chứa Dockerfile)
docker compose build
docker compose up -d
```

Mở trình duyệt: **http://localhost:8080**

### Link HTTPS tạm (máy bạn vẫn phải chạy Docker)

Để người khác mở được qua Internet mà **chưa** deploy lên Render/VPS: sau `docker compose up -d`, trên máy host chạy tunnel trỏ vào cổng `8080`, ví dụ `npx -y localtunnel --port 8080` — terminal sẽ in một URL `https://....` (thường có trang xác nhận lần đầu). Cách này chỉ phù hợp demo ngắn, không thay thế hosting thật.

### Nạp dữ liệu mẫu (một lần sau khi container chạy)

Database SQLite nằm trong volume `hotel_data` tại `/data/app.db` **bên trong container**.

```bash
docker compose exec web sh -c "cd /app/backend && PYTHONPATH=/app/backend DATABASE_URL=sqlite:////data/app.db python scripts/seed_db.py"
```

*(Lệnh `seed_db` xóa và tạo lại bảng — chỉ dùng khi chấp nhận reset dữ liệu.)*

### Đưa lên VPS (tóm tắt)

1. Cài Docker trên server.
2. Clone repo, `docker compose build && docker compose up -d`.
3. Đặt reverse proxy (Caddy / Nginx trên host) trỏ domain HTTPS → cổng `8080` (hoặc đổi mapping thành `80:80`).
4. Bảo mật: bản demo **không có đăng nhập** — chỉ nên để **mạng nội bộ** hoặc thêm auth / VPN trước khi public internet.

### Dùng PostgreSQL thay SQLite (ổn định hơn khi nhiều worker)

Trong `docker-compose.yml`, thay `DATABASE_URL` bằng chuỗi Postgres (xem `backend/.env.example`) và thêm service `db` nếu cần. Chạy `seed_db` một lần sau khi DB trống.

---

## B. Tách Frontend và Backend (Vercel / Netlify + Render / Railway)

### Backend

1. Tạo **Web Service** trỏ vào thư mục `backend/`.
2. Lệnh start ví dụ: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Biến môi trường:
   - `DATABASE_URL`: **bắt buộc Postgres** (SQLite trên serverless thường không phù hợp).
   - `CORS_ORIGINS`: URL frontend thật, ví dụ `https://your-app.vercel.app`
4. Sau deploy, chạy **một lần** seed (shell one-off hoặc job) với `PYTHONPATH` trỏ `backend`.

### Frontend (Vercel / Netlify / Cloudflare Pages)

1. Root build: thư mục `frontend/`, build `npm run build`, publish `dist/`.
2. Biến build: `VITE_API_BASE_URL=https://your-api.onrender.com/api/v1` (đúng URL API).

---

## C. Render.com (một URL HTTPS, Docker giống máy bạn)

Repo có [`render.yaml`](render.yaml) (Web Service `docker` + env mẫu).

1. Đẩy code lên **GitHub** (repo private cũng được).
2. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → chọn repo → xác nhận tạo service.
3. Đợi build Docker (vài phút). URL dạng `https://<tên-service>.onrender.com`.
4. Nếu đổi **tên service** trong Render, vào **Environment** sửa `CORS_ORIGINS` cho đúng URL mới (cùng domain với trình duyệt nếu sau này bạn tách FE/API).
5. **Dữ liệu mẫu:** Blueprint đặt `SEED_ON_START=1` — lần đầu container thấy SQLite **không có** bảng `properties` (hoặc rỗng) sẽ tự chạy `seed_db.py` khi khởi động, **không cần Shell**. Muốn tắt: Environment → `SEED_ON_START=0`. Muốn seed lại tay (máy có Shell hoặc local): vẫn có thể chạy lệnh trong khối code dưới.

   ```bash
   cd /app/backend && PYTHONPATH=/app/backend python scripts/seed_db.py
   ```

**Gói free:** không có persistent disk; SQLite có thể **trống hoặc mất** sau redeploy. Muốn dữ liệu bền: tạo **PostgreSQL** trên Render, đặt `DATABASE_URL` trỏ tới Postgres, chạy `seed_db` một lần.

Nếu log báo **`unable to open database file`**: nguyên nhân thường là thư mục `/data` chưa tồn tại trong container. Bản image hiện tại tạo `/data` ở **entrypoint** + **Dockerfile**; hãy **commit + push** rồi **Manual Deploy** lại trên Render.

**Shell Render trả phí:** trên gói free có thể không dùng Shell để chạy `seed_db`. Blueprint đặt **`SEED_ON_START=1`**: mỗi lần container khởi động, nếu SQLite **chưa có dòng `properties`** thì image tự chạy `scripts/seed_db.py` một lần (cần file `*.csv` đã được COPY vào image). Tắt bằng cách đặt `SEED_ON_START=0` trong Environment khi không muốn tự seed nữa.

---

## AI (Groq / Ollama)

Trên server, thêm vào env (giống `backend/.env.example`):

- `GROQ_API_KEY` hoặc cấu hình Ollama.

Không có khóa thì một số luồng vẫn chạy **heuristic** trong code.

---

## Kiểm tra nhanh

- Trang chủ UI: `/` hoặc `/overview`
- API: `/health` → `{"status":"ok"}`
- Swagger: `/docs`

---

## Tài liệu trong repo

- Cài đặt dev cục bộ: [README.md](README.md)
- Chi tiết backend: [backend/README.md](backend/README.md)
