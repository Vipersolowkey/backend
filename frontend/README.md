# Hotel Management & Analytics — Frontend

React 18, Vite 5, Tailwind CSS, React Router.

## Chạy dev

1. Cài dependency:
   ```bash
   npm install
   ```
2. Khởi động dev server:
   ```bash
   npm run dev
   ```
3. Backend FastAPI phải chạy tại **http://127.0.0.1:8000** (mặc định trong `src/lib/dashboardApi.js` và một số `fetch` trong các trang). Nếu đổi port hoặc domain API, cần sửa các constant đó hoặc sau này gom qua biến `import.meta.env.VITE_*`.

## Build & preview

```bash
npm run build
npm run preview
```

## Tài liệu tổng thể

Xem [README.md](../README.md) ở thư mục gốc dự án.
