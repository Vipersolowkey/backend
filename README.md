# Quản trị & phân tích khách sạn hỗ trợ AI (UEL)

Tài liệu mô tả **phạm vi, chức năng và cách triển khai bản demo** trên máy cục bộ. Phần đầu trình bày bằng ngôn ngữ gần với vận hành khách sạn; phụ lục ghi các chi tiết kỹ thuật ngắn.

---

## Tổng quan

Đây là **phiên bản demo** của một hệ thống hỗ trợ **theo dõi vận hành và định giá**, tích hợp **phân tích thị trường / đối thủ** và **module AI tùy chọn** (khi cấu hình khóa dịch vụ). Dữ liệu trong demo là **mẫu đã nạp sẵn**, phục vụ minh họa luồng làm việc chứ không phải PMS thực tế.

**Phạm vi chính:**

- Dashboard **doanh thu**, **tin hiệu ưu tiên** và **cảnh báo** gắn với nguy cơ **hủy phòng** khi áp lực giá từ thị trường.
- **Đối thủ / khu vực**: dữ liệu competitor nhập sẵn; có thể bổ sung insight hoặc hội thoại qua AI khi bật nhà cung cấp LLM.
- **App khách (guest app)** — trải nghiệm trong kỳ nghỉ: timeline lưu trú, ưu đãi theo segment CRM, đặt bàn / gọi món, folio & xuất bill, yêu cầu dọn phòng; đồng bộ qua API `guest-app` (nhập **mã booking** trên màn hình). Giao diện app khách hiện dùng **tiếng Anh** cho demo quốc tế.
- **Vận hành phòng & buồng phòng (HK)** — bảng theo từng phòng: trạng thái lưu trú (trống / đã đặt / đang ở) và trạng thái dọn phòng; dành cho lễ tân / HK (`/operations/rooms`).
- **Công cụ bổ sung** (tùy phiên bản mã nguồn): lịch **công suất phòng**, **xuất báo cáo** (Excel/CSV), **CRM khách** dạng nhẹ, **đa cơ sở / khu vực**, **ngưỡng cảnh báo** kèm webhook, **Owner guest pulse** (`/owner-guest-pulse`) — tổng quan tín hiệu góc chủ sở hữu liên quan app khách.

Giải pháp **không** thay thế phần mềm quản lý buồng phòng (PMS) **đầy đủ**; thể hiện hướng **kết hợp dữ liệu, giao diện và AI** trong bối cảnh revenue / ops.

---

## Cấu trúc giao diện

Sau khi ứng dụng web được khởi chạy (mục *Cài đặt và chạy thử*), menu điều hướng dẫn tới các khu vực sau:

| Mục menu | Mô tả ngắn |
|----------|------------|
| **Overview** | Tổng quan doanh thu, thứ tự ưu tiên vận hành; **AI Revenue Manager**, **Pricing Lab** (mô phỏng kịch bản giá / kịch bản nhu cầu); **market lens** so với đối thủ; có thể **lọc theo cơ sở / khu vực**. |
| **Calendar** | Lịch **mức lấp đầy phòng theo ngày** (ước lượng từ dữ liệu demo). |
| **Reports** | **Tải** file Excel hoặc CSV tóm tắt phục vụ báo cáo. |
| **Guests CRM** | Hồ sơ khách nhẹ: nhãn, ghi chú, dòng thời gian. |
| **Sales AI** | Kịch bản tư vấn / bán hàng có hỗ trợ AI. |
| **Competitors** | Theo dõi đối thủ, insight và chat liên quan thị trường. |
| **Alerts** | Booking **rủi ro cao**, email giữ chân; có **đánh giá ngưỡng** (occupancy, số booking rủi ro). |
| **Vận hành — Phòng & HK** | Danh sách phòng theo property: booking đang ở, mã đặt, trạng thái dọn phòng — đường dẫn **`/operations/rooms`** (menu Organic / Ops). |
| **App khách** | Tab **Home / Offers / Dine / Me** — **`/guest-app`**, **`/guest-app/offers`**, **`/guest-app/dine`**, **`/guest-app/me`**. Nút **Ops** trên header app khách quay về dashboard tổng quan. |

**Lưu ý:** Sau khi `seed_db`, dùng một **mã booking** có trong dữ liệu mẫu (ví dụ mặc định trên form app khách) để tải session, timeline và folio.

Việc **trình chiếu hoặc ghi hình** luồng thao tác trên giao diện có thể đi kèm khi không triển khai demo trực tiếp trên máy người đọc.

---

## Thuật ngữ (phiên bản rút gọn)

- **Dashboard / Overview**: Màn hình tổng hợp chỉ số và cảnh báo cho nhà điều hành.
- **AI trong demo**: Gọi API LLM bên ngoài để sinh văn bản phân tích / gợi ý từ **bối cảnh số liệu đưa vào**. Khi chưa cấu hình khóa, một số luồng **vẫn phản hồi** bằng **luật heuristic** có trong mã — không phải phản hồi ngẫu nhiên.
- **SQLite**: Cơ sở dữ liệu một file, phù hợp demo cục bộ; không bắt buộc PostgreSQL để chạy thử mặc định.

---

## Cài đặt và chạy thử

**Điều kiện:** Python và Node.js trên máy chạy demo. **Backend** phục vụ API và dữ liệu; **frontend** phục vụ trình duyệt.

### Windows (PowerShell)

Thay `D:\du lich` bằng đường dẫn thư mục chứa mã nguồn.

**Terminal 1 — API và dữ liệu:**

```powershell
cd "D:\du lich"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
$env:PYTHONPATH = "$PWD\backend"
python backend\scripts\seed_db.py
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

**Terminal 2 — giao diện:**

```powershell
cd "D:\du lich\frontend"
npm install
npm run dev
```

Trình duyệt: **http://127.0.0.1:5173**

Để kích hoạt LLM đầy đủ: trong `backend\.env` đặt **GROQ_API_KEY** hoặc cấu hình **Ollama** theo [backend/README.md](backend/README.md).

### macOS / Linux

Quy trình tương tự (virtualenv, `seed_db`, `uvicorn`, sau đó `npm run dev` trong `frontend/`). Chi tiết: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md).

---

## Phụ lục kỹ thuật

- **Thư mục:** `backend/` (API, seed), `frontend/` (React/Vite).
- **Kiểm tra API:** http://127.0.0.1:8000/health — **OpenAPI:** http://127.0.0.1:8000/docs  
- **API app khách (REST):** prefix `/api/v1/guest-app/` — session, timeline, offers, dining/HK request, folio line, export bill, bảng phòng. Chi tiết tham số xem OpenAPI hoặc [TAI_LIEU_DU_AN.md](TAI_LIEU_DU_AN.md).
- **Frontend — biến môi trường:** `VITE_API_BASE_URL` (mặc định `http://127.0.0.1:8000/api/v1`); tùy chọn `VITE_WEATHER_LAT` / `VITE_WEATHER_LON` cho widget thời tiết trên Home app khách.
- **Bảo mật:** Bản demo **không** có xác thực người dùng; chỉ dùng trong môi trường cục bộ hoặc mạng tin cậy. Triển khai công khai cần HTTPS, auth và giới hạn tần suất gọi AI.

---

Tài liệu dự án bổ sung (nếu có): [TAI_LIEU_DU_AN.md](TAI_LIEU_DU_AN.md).

**Định hướng mở rộng (app khách, up sell, hai persona chủ/khách):** [DINH_HUONG_APP_KHACH_HOTEL.md](DINH_HUONG_APP_KHACH_HOTEL.md).
