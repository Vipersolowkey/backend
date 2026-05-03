# Định hướng sau phiên họp — App khách sạn (khách + chủ)

**Cập nhật:** tháng 5/2026  
**Mục đích:** ghi lại ý tưởng, câu hỏi phạm vi giao diện và backlog tính năng **upsell** / **cá nhân hóa** để team và repo cùng tham chiếu. Bản đề xuất chiến lược tổng thể (Command Center / analytics) vẫn nằm trong [`HOTEL_AI_PROPOSAL.md`](./HOTEL_AI_PROPOSAL.md).

---

## 1. Chốt ý tưởng sản phẩm

Làm **ứng dụng cho khách sạn** với mục tiêu chính:

- **Up sell** và **đặt phòng**
- **Check-in qua app**
- **Mở cửa phòng bằng điện thoại** (mobile key)
- **Gọi dịch vụ phòng** và **thanh toán** trên **một nền tảng duy nhất**

---

## 2. Vấn đề phạm vi giao diện & quyết định

| Câu hỏi | Trả lời định hướng |
|--------|----------------------|
| Giao diện hiện tại / ưu tiên là **quản lý khách sạn** (xem doanh thu) hay **khách** dùng app? | Mong muốn **hai chiều**: (A) chủ / quản lý xem dữ liệu khách qua app; (B) khách dùng app trong hành trình lưu trú. |
| Nếu **không kịp** làm cả hai? | **Ưu tiên giao diện khách** tương tác với app (guest-first MVP). |

**Ghi chú triển khai:** có thể tách rõ hai “app persona” hoặc hai khu vực trong cùng codebase (ví dụ `/guest/*` vs `/owner/*`) để sau này mở rộng mà không phá vỡ luồng demo dashboard hiện có.

---

## 3. Up sell cho khách (backlog chi tiết)

### 3.1 Thông báo thông minh (context sau đặt phòng)

Ví dụ copy:

> Chúc mừng bạn đã đặt phòng thành công! Để kỳ nghỉ thêm trọn vẹn, bạn có muốn đặt trước **xe đưa đón từ sân bay** không?

### 3.2 Nâng cấp phòng (Room upgrade)

- Gửi **thông điệp + hình ảnh** minh họa phòng nâng cấp.
- Ví dụ: *“Chỉ thêm 50k, nâng cấp lên phòng hướng biển để ngắm hoàng hôn ngay tại ban công. Bạn có muốn thử không?”*

### 3.3 Đặt lịch trước (Pre-book services)

- Gợi ý dịch vụ **giới hạn thời gian / chỗ**.
- Ví dụ: *“Spa thường rất đông vào giờ vàng (17h–19h), bạn có muốn đặt chỗ trước để nhận ưu đãi 15% không?”*

### 3.4 Gói tùy chỉnh (Add-on)

Khách chọn thêm: gối lông vũ, tinh dầu trong phòng, bữa sáng sớm (chuyến bay sớm), v.v.

### 3.5 Thông báo theo thời tiết

Nếu hệ thống (hoặc AI + nguồn thời tiết) nhận diện trời mưa:

> Trời đang mưa, bạn có thể thưởng thức **trà chiều tầng lửng** hoặc **gọi món tại phòng** với menu đặc biệt cho ngày mưa.

### 3.6 Bán hàng theo khung giờ (Happy hour)

Ví dụ lúc ~16h:

> Chỉ còn 1 tiếng nữa là đến Happy Hour tại Rooftop Bar, **mua 1 tặng 1** cho các loại cocktail.

### 3.7 Dịch vụ tận phòng (In-room upsell)

- Thay menu giấy: **QR hoặc app** với hình ảnh món hấp dẫn.
- AI gợi ý kèm: *“Khách thường gọi thêm khoai tây chiên cùng Burger này.”*

---

## 4. Cá nhân hóa trong app

### 4.1 Gu âm nhạc & ánh sáng

- Liên kết **Spotify** (hoặc nguồn nhạc được phép) để phát playlist yêu thích khi khách vào phòng (khi hạ tầng phòng hỗ trợ).
- Kịch bản ánh sáng: **Reading**, **Relax**, **Romantic** (tích hợp IoT / partner PMS tùy triển khai thực tế).

### 4.2 Quà tặng bất ngờ

- Dựa trên **sinh nhật** / **ngày kỷ niệm** đã thu thập ở **bộ câu hỏi onboarding**.
- App thông báo có **món quà nhỏ** đang chờ trong phòng (theo chính sách khách sạn).

---

## 5. Liên hệ với repo hiện tại

Prototype trong repo này đang nhấn mạnh **dashboard vận hành / AI sales** (xem [`README.md`](./README.md)). Phần **app khách** ở trên là **lớp sản phẩm tiếp theo**; có thể map dần: thông báo upsell ↔ engine gợi ý + CRM guest; thanh toán / dịch vụ phòng ↔ module đặt hàng và webhook tích hợp PMS.
