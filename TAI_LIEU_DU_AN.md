# Tài liệu dự án — Hotel AI / Quản trị khách sạn & phân tích

**Cập nhật:** tháng 5/2026  
**Mục đích tài liệu:** mô tả ngắn gọn *repo này đang làm gì*, cấu trúc, API và cách chạy. Bản đề xuất chiến lược chi tiết nằm trong `HOTEL_AI_PROPOSAL.md`; bản hướng dẫn sản phẩm/CLI nằm trong `PRODUCT_README.md`. **Định hướng app khách + upsell + cá nhân hóa** (sau phiên họp) nằm trong [`DINH_HUONG_APP_KHACH_HOTEL.md`](./DINH_HUONG_APP_KHACH_HOTEL.md).

---

## 1. Dự án là gì?

Đây là prototype **“Hotel Management & Analytics”** — nền tảng hỗ trợ khách sạn xem **dashboard doanh thu / hủy / theo quốc gia**, **dự đoán giá động** và **rủi ro hủy phòng**, **tích hợp LLM** cho insight đối thủ, tư vấn khách, lead scoring, playbook chuyển đổi, chat (kể cả stream SSE), và **sinh email khuyến mãi**.

Tên định hướng trong đề xuất: **Hotel AI Command Center** — AI hỗ trợ vận hành, doanh thu và trải nghiệm khách (`HOTEL_AI_PROPOSAL.md`).

---

## 2. Kiến trúc tổng quan

| Thành phần | Công nghệ | Vai trò |
|------------|-----------|---------|
| Backend | Python, **FastAPI**, SQLAlchemy | REST API, logic PMS/analytics, gọi LLM (Groq / Ollama / OpenAI / Gemini tùy cấu hình) |
| Frontend | **React**, Vite, Tailwind, React Router | Giao diện: Overview, Sales AI, Competitors, Alerts |
| Dữ liệu | PostgreSQL hoặc **SQLite** mặc định (dev) | Lưu guest, phòng, booking, bảng tổng hợp analytics, `competitor_data` (JSON review, giá, v.v.) |

Khởi tạo bảng: `Base.metadata.create_all` khi API startup (`backend/app/main.py`).

---

## 3. Mô hình dữ liệu chính (backend)

- **PMS:** khách (`Guest`), loại phòng (`RoomType`), phòng (`Room`), đặt phòng (`Booking`) — xem `backend/app/models/pms.py`.
- **Analytics:** doanh thu theo tháng, tổng hợp hủy, tổng hợp theo quốc gia — `backend/app/models/analytics.py`.
- **Đối thủ:** `CompetitorData` — nguồn (vd. agoda), khu vực tìm kiếm, tên khách sạn, giá, tiền tệ, trạng thái còn phòng, URL, mảng review (JSON/JSONB), thời điểm scrape — `backend/app/models/competitor_data.py`.

---

## 4. API chính (prefix: `/api/v1`)

**Sức khỏe**

- `GET /health`

**Dashboard**

- `GET /api/v1/dashboard` — payload tổng hợp cho màn hình tổng quan.

**Dự đoán**

- `GET /api/v1/predictive/dynamic-price?room_id=…&target_date=…` — gợi ý giá.
- `POST /api/v1/predictive/cancellation-risk` — đánh giá rủi ro hủy theo booking/context.

**Marketing**

- `POST /api/v1/marketing/generate-promo-email` — sinh nội dung email khuyến mãi theo booking.

**AI** (`backend/app/api/routes/ai.py`)

- `POST /api/v1/ai/competitor-insights`
- `POST /api/v1/ai/competitor-hotels`
- `POST /api/v1/ai/competitor-hotel-intelligence`
- `POST /api/v1/ai/guest-advisor`
- `POST /api/v1/ai/lead-scoring`
- `POST /api/v1/ai/conversion-playbook`
- `POST /api/v1/ai/guest-chat`
- `POST /api/v1/ai/guest-chat/stream` — stream (SSE).
- `POST /api/v1/ai/competitor-chat/stream` — stream (SSE).

CORS mặc định cho dev: `localhost:5173` và `127.0.0.1:5173` (`backend/app/core/config.py`).

---

## 5. Giao diện web (frontend)

Định tuyến trong `frontend/src/App.jsx`:

| Đường dẫn | Trang |
|-----------|--------|
| `/` | Chuyển hướng → `/overview` |
| `/overview` | Tổng quan (doanh thu, v.v.) |
| `/sales-ai` | Sales / AI tư vấn khách |
| `/competitors` | Đối thủ / insight |
| `/alerts` | Cảnh báo (vd. rủi ro hủy cao) |

---

## 6. Cấu hình môi trường (tóm tắt)

File mẫu: `backend/.env.example` (nên copy thành `backend/.env`).

Các biến thường dùng:

- `DATABASE_URL` — nếu không set, backend có thể dùng SQLite mặc định cho dev.
- Khóa / nhà cung cấp LLM: `GROQ_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, hoặc Ollama (`OLLAMA_BASE_URL`, `OLLAMA_API_KEY`, `OLLAMA_MODEL`).
- `LLM_PROVIDER` — ví dụ `auto` (thử Groq rồi fallback Ollama), xem `backend/README.md`.
- `CORS_ORIGINS` — nếu frontend chạy host/port khác.

---

## 7. Chạy nhanh

Chi tiết đầy đủ: `PRODUCT_README.md` và `backend/README.md`.

**Backend (ví dụ):** cài venv, `pip install -r backend/requirements.txt`, đặt `PYTHONPATH` trỏ thư mục backend, (tùy) `python backend/scripts/seed_db.py`, rồi:

`uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` với working directory / `app-dir` phù hợp cấu trúc máy bạn.

**Frontend:** trong `frontend/`, `npm install` và `npm run dev`.

---

## 8. Trạng thái & hướng mở rộng

Repo hiện là **bản demo có chức năng thật**: API, model DB, tích hợp LLM, vài màn hình React. Có thể mở rộng theo lộ trình trong `HOTEL_AI_PROPOSAL.md` (tích hợp OTA thật, worker scrape định kỳ, auth đa tenant, v.v.) — phần đó là định hướng sản phẩm, không nhất thiết đã có đủ code trong repo.

---

*Nếu cần bản Word/PDF cho nộp hồ sơ, có thể xuất từ file này hoặc dùng template từ `HOTEL_AI_PROPOSAL.md`.*
