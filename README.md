# Dự án: Quản trị & phân tích khách sạn hỗ trợ AI (UEL)

*Tài liệu này giúp **giám khảo / người xem ** hiểu nhanh dự án là gì, có ích gì cho nhà điều hành khách sạn, và cách mở xem trên máy tính.*

---

## Dự án này làm gì?

Đây là một **bản mô phỏng (demo)** hệ thống hỗ trợ **quản lý vận hành và ra quyết định giá** cho khách sạn. Sinh viên tập trung vào:

- Theo dõi **doanh thu**, **xu hướng** và **cảnh báo** liên quan đến nguy cơ khách **hủy phòng** khi giá thị trường cạnh tranh hơn.
- Xem **đối thủ / thị trường** (dữ liệu mẫu đã nhập sẵn) và nhận **phân tích gợi ý** nhờ AI (khi đã cấu hình khóa dịch vụ AI).
- Thử các công cụ bổ sung: **lịch công suất phòng**, **xuất báo cáo Excel**, **CRM khách nhẹ**, **nhiều cơ sở / khu vực**, **ngưỡng cảnh báo** có thể gửi tin ra webhook.

Ứng dụng **không thay thế** phần mềm quản lý khách sạn (PMS) thật; mục tiêu học thuật là cho thấy cách **kết hợp dữ liệu + giao diện + AI** để hỗ trợ ra quyết định.

---

## Giám khảo nên xem những phần nào?

Trên giao diện web (sau khi chạy demo — xem mục dưới), có thể lần lượt mở các mục trong menu:

| Khu vực trên màn hình | Sinh viên muốn thể hiện điều gì |
|----------------------|-----------------------------------|
| **Overview** | Tổng quan doanh thu, ưu tiên vận hành, thử **AI Revenue Manager**, **Pricing Lab** (mô phỏng kịch bản giá / mùa cao điểm), và **góc nhìn thị trường** so với đối thủ. Có thể chọn **một cơ sở / khu vực** để lọc cảnh báo. |
| **Calendar** | Lịch **mức độ lấp đầy phòng theo ngày** (ước lượng từ dữ liệu demo). |
| **Reports** | **Tải file Excel / CSV** tóm tắt số liệu phục vụ báo cáo hoặc trình bày. |
| **Guests CRM** | **Hồ sơ khách nhẹ**: nhãn (tag), ghi chú, dòng thời gian — minh họa quản trị quan hệ khách. |
| **Sales AI** | Kịch bản bán hàng / tư vấn khách (AI). |
| **Competitors** | Soi đối thủ và chat / insight liên quan thị trường. |
| **Alerts** | Danh sách booking **rủi ro cao**, email giữ chân khách; có **kiểm tra ngưỡng cảnh báo** (occupancy, số booking rủi ro…). |
---

## Cách chạy demo trên máy 

**Ý tưởng:** máy cần có **Python** và **Node.js**; chạy **máy chủ phía sau** (backend) rồi **giao diện** (frontend), sau đó mở trình duyệt.

### Windows (PowerShell)

Đổi `D:\du lich` thành đúng thư mục chứa mã nguồn.

**Cửa sổ 1 — máy chủ dữ liệu & API:**

```powershell
cd "D:\du lich"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
$env:PYTHONPATH = "$PWD\backend"
python backend\scripts\seed_db.py
uvicorn app.main:app --reload --app-dir backend
```

**Cửa sổ 2 — giao diện web:**

```powershell
cd "D:\du lich\frontend"
npm install
npm run dev
```

Mở trình duyệt: **http://127.0.0.1:5173** — trang chủ demo.

*(Để AI “nói” đầy đủ hơn: trong file `backend\.env` điền khóa **GROQ_API_KEY** hoặc cấu hình **Ollama** theo hướng dẫn trong `backend/README.md`.)*

### macOS / Linux

Tương tự: một terminal chạy backend (sau `seed`), một terminal chạy `npm run dev` trong thư mục `frontend`. Chi tiết xem [backend/README.md](backend/README.md) và [frontend/README.md](frontend/README.md).

---

## Phụ lục — Thông tin kỹ thuật ngắn (nếu cần)

- **Cấu trúc thư mục:** `backend/` (API, dữ liệu mẫu), `frontend/` (giao diện).
- **API kiểm tra hoạt động:** http://127.0.0.1:8000/health — **tài liệu API cho lập trình viên:** http://127.0.0.1:8000/docs  
- **Lưu ý:** Phiên bản demo **chưa có đăng nhập / phân quyền**; chỉ nên chạy trên máy cá nhân hoặc mạng tin cậy. Triển khai thật cần thêm bảo mật và HTTPS.

---

*Tài liệu chi tiết song ngữ / kỹ thuật bổ sung có thể có trong [TAI_LIEU_DU_AN.md](TAI_LIEU_DU_AN.md) .*
