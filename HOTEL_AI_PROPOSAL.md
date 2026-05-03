# ĐỀ XUẤT DỰ ÁN
## ỨNG DỤNG AI TRONG QUẢN TRỊ KHÁCH SẠN, PHÂN TÍCH DỮ LIỆU VÀ TỐI ƯU HÓA TRẢI NGHIỆM KHÁCH HÀNG

## DỰ ÁN: HOTEL AI COMMAND CENTER

Dự án trình bày: `Hotel AI Command Center` – Nền tảng AI hỗ trợ vận hành, doanh thu và chăm sóc khách hàng cho khách sạn

TP.HCM, ngày 19/04/2026

---

## PHỤ LỤC

1. Giới thiệu dự án
2. Lý do thực hiện
3. Mục tiêu dự án
4. Phạm vi và quy mô triển khai
5. Thực trạng vận hành khách sạn hiện nay
6. Giải pháp công nghệ đề xuất
7. Kiến trúc hệ thống
8. Các chức năng AI trọng tâm
9. Phân tích dữ liệu và ứng dụng dữ liệu
10. Quy trình triển khai
11. Kế hoạch triển khai theo giai đoạn
12. Đo lường hiệu quả
13. Chi phí dự kiến
14. Rủi ro và giải pháp
15. Duy trì và vận hành hệ thống
16. Kết luận
17. Phụ lục: định hướng app khách & up sell (sau phiên họp)

---

## 1. Giới thiệu dự án

`Hotel AI Command Center` là một nền tảng quản trị khách sạn tích hợp AI, được thiết kế nhằm hỗ trợ doanh nghiệp khách sạn tối ưu đồng thời 3 trụ cột quan trọng:

- Vận hành nội bộ khách sạn
- Tối ưu doanh thu và giá bán
- Tăng trải nghiệm khách hàng trước, trong và sau lưu trú

Hệ thống kết hợp giữa dữ liệu đặt phòng, dữ liệu doanh thu, dữ liệu đối thủ, dữ liệu đánh giá khách hàng và mô hình AI để hỗ trợ nhà quản lý ra quyết định nhanh hơn, chính xác hơn và có khả năng tự động hóa cao hơn.

---

## 2. Lý do thực hiện

Ngành khách sạn hiện đang đối mặt với nhiều áp lực:

- Cạnh tranh giá mạnh trên Agoda, Booking và các OTA
- Tỷ lệ hủy phòng ngày càng biến động
- Nhu cầu phản hồi khách hàng nhanh, cá nhân hóa và 24/7
- Dữ liệu vận hành, doanh thu, phản hồi khách hàng thường phân tán
- Nhân sự chăm sóc khách hàng và sales reservation phải xử lý nhiều tác vụ lặp lại

Trong thực tế, nhiều khách sạn vẫn chưa có một hệ thống hợp nhất để:

- Theo dõi giá đối thủ và phản ứng kịp thời
- Dự đoán rủi ro hủy phòng
- Tư vấn khách hàng như một nhân viên sales chuyên nghiệp
- Tự động gợi ý upsell và giữ chân khách
- Phân tích insight từ review đối thủ để cải thiện positioning

Vì vậy, dự án `Hotel AI Command Center` được xây dựng nhằm giải quyết bài toán vận hành, doanh thu và trải nghiệm khách hàng bằng dữ liệu và trí tuệ nhân tạo.

---

## 3. Mục tiêu dự án

Dự án hướng tới các mục tiêu chính sau:

- Xây dựng hệ thống quản trị dữ liệu khách sạn tập trung
- Tự động hóa một phần quy trình chăm sóc khách hàng và tư vấn phòng
- Hỗ trợ tối ưu giá bán dựa trên dữ liệu booking và dữ liệu đối thủ
- Phát hiện sớm booking có nguy cơ hủy cao
- Phân tích review đối thủ để rút ra insight kinh doanh
- Hỗ trợ đội ngũ sales/reservation bằng AI chat và playbook chốt sale
- Tăng tỷ lệ chuyển đổi đặt phòng và tăng doanh thu từ upsell

Mục tiêu định lượng kỳ vọng:

- Tự động hỗ trợ 60-80% câu hỏi tư vấn cơ bản
- Tăng 5-12% tỷ lệ chuyển đổi đặt phòng trực tiếp
- Tăng 8-15% doanh thu phụ trợ từ upsell
- Giảm 30-50% khối lượng xử lý thủ công của bộ phận CSKH/reservation
- Rút ngắn thời gian phản hồi khách xuống dưới 1 phút với các truy vấn phổ biến

---

## 4. Phạm vi và quy mô triển khai

Đối tượng phù hợp:

- Khách sạn vừa và nhỏ
- Chuỗi khách sạn boutique
- Homestay/Resort có nhu cầu chuyên nghiệp hóa vận hành
- Doanh nghiệp du lịch lưu trú muốn ứng dụng AI nhưng chưa có hệ thống nội bộ mạnh

Phạm vi hệ thống:

- Backend quản trị dữ liệu khách sạn
- Dashboard phân tích doanh thu và booking
- Module phân tích đối thủ
- Module predictive AI
- Module AI sales concierge / guest advisor
- Frontend dashboard cho admin và đội vận hành

Nguồn dữ liệu áp dụng:

- Dữ liệu lịch sử booking CSV
- Dữ liệu doanh thu theo tháng
- Dữ liệu phòng và loại phòng
- Dữ liệu quốc gia khách hàng
- Dữ liệu đối thủ từ Agoda/Booking JSON
- Dữ liệu review và sentiment từ đối thủ

---

## 5. Thực trạng vận hành khách sạn hiện nay

Nhiều khách sạn hiện gặp các vấn đề:

- Giá phòng chưa phản ứng đủ nhanh với biến động thị trường
- Booking có nguy cơ hủy không được phát hiện sớm
- Đội sales thiếu công cụ để biết khách nào dễ chốt, nên upsell gì
- Thông tin đối thủ được theo dõi thủ công, thiếu cập nhật và khó phân tích
- Nhân viên CSKH trả lời lặp đi lặp lại các câu hỏi giống nhau
- Marketing thiếu insight thực tế từ review đối thủ và hành vi khách hàng

Hệ quả là:

- Mất cơ hội doanh thu
- Tăng chi phí nhân sự
- Chậm ra quyết định
- Khó nâng cao trải nghiệm khách hàng một cách nhất quán

---

## 6. Giải pháp công nghệ đề xuất

Dự án đề xuất một nền tảng gồm 4 lớp giải pháp chính:

### 6.1 Core PMS + Analytics

- Quản lý booking, guest, room, room type
- Tổng hợp revenue, occupancy, cancellation
- Dashboard trực quan cho admin

### 6.2 Competitor Intelligence

- Nạp dữ liệu đối thủ từ Agoda/Booking
- Phân tích giá, availability, review snippets
- Tạo insight về điểm mạnh/yếu của đối thủ

### 6.3 Predictive AI

- Dynamic pricing
- Cancellation risk prediction
- Recommendation logic cho giữ chân khách

### 6.4 Conversational AI cho sales và CSKH

- AI Guest Advisor
- AI lead scoring
- AI conversion playbook
- AI chat widget đa lượt như nhân viên thật
- Generate promo email để giữ booking

---

## 7. Kiến trúc hệ thống

Công nghệ đề xuất:

- Backend: `FastAPI (Python)`
- Database: `PostgreSQL`
- Frontend: `React.js + Tailwind CSS`
- AI/LLM: `Ollama` hoặc cloud LLM
- Data processing: `Pandas`
- ORM: `SQLAlchemy`

Luồng dữ liệu tổng quát:

1. Dữ liệu booking, room, guest, revenue được nạp vào hệ thống
2. Dữ liệu đối thủ từ Agoda/Booking được import vào `CompetitorData`
3. Backend chuẩn hóa và lưu trữ dữ liệu
4. AI services sử dụng dữ liệu nội bộ + dữ liệu đối thủ để suy luận
5. Dashboard hiển thị KPI, insight, risk, recommendation
6. Nhân viên vận hành/sales tương tác với AI ngay trên giao diện quản trị

---

## 8. Các chức năng AI trọng tâm

### 8.1 Dynamic Pricing

Hệ thống so sánh:

- Tỷ lệ lấp đầy hiện tại
- Giá đối thủ
- Availability của đối thủ

Nếu đối thủ giá cao và availability thấp, hệ thống đề xuất tăng giá phòng ở mức phù hợp.

### 8.2 Cancellation Risk Prediction

Dựa trên:

- Giá khách đã đặt
- Giá đối thủ cùng khu vực
- Chênh lệch mức giá
- Dữ liệu booking hiện có

Nếu phát hiện đối thủ rẻ hơn đáng kể, hệ thống gắn cờ booking `HIGH RISK`.

### 8.3 Competitor Insight AI

Từ review của đối thủ, hệ thống rút ra:

- Khách đang khen điều gì
- Khách đang chê điều gì
- Điểm yếu của đối thủ có thể khai thác
- Hook marketing và positioning phù hợp

### 8.4 AI Guest Advisor

Mô phỏng nhân viên tư vấn:

- Đọc nhu cầu khách
- Đề xuất room type phù hợp
- Đưa ra anchor giá
- Gợi ý upsell
- Viết sẵn script tư vấn

### 8.5 Auto Lead Scoring

Hệ thống chấm điểm lead theo:

- Mức độ sẵn sàng đặt
- Độ nhạy cảm về giá
- Mục tiêu chuyến đi
- Số khách, số đêm, ngân sách
- Nội dung khách nhắn

Kết quả:

- Lead score
- Hot / Warm / Cold
- Buyer type
- Close probability
- Upsell priority

### 8.6 Booking Conversion Playbook

AI tự sinh playbook chốt sale:

- Opening script
- Value points
- Upsell strategy
- Close strategy
- Follow-up cadence
- Script variants theo loại khách

### 8.7 AI Chat Widget đa lượt

Đây là bước nâng cấp từ chatbot trả lời đơn lẻ sang “AI reservation agent”:

- Ghi nhớ lịch sử chat
- Xử lý objection
- Chuyển giai đoạn từ tư vấn sang close
- Đề xuất bước tiếp theo cho nhân viên
- Giữ phong cách trả lời tự nhiên như người thật

---

## 9. Phân tích dữ liệu và ứng dụng dữ liệu

Hệ thống tận dụng dữ liệu để hỗ trợ nhiều lớp quyết định:

### 9.1 Dữ liệu vận hành

- Booking volume
- Occupancy
- ADR
- Revenue trend
- Cancellation summary

### 9.2 Dữ liệu khách hàng

- Quốc gia / nguồn khách
- Mức giá khách chấp nhận
- Thói quen đặt phòng
- Hành vi phản hồi trong chat

### 9.3 Dữ liệu đối thủ

- Giá hiện tại
- Trạng thái còn phòng
- Review comments
- Sentiment theo khách hàng

### 9.4 Ứng dụng kết quả phân tích

- Điều chỉnh giá bán
- Ưu tiên booking cần giữ chân
- Chọn ưu đãi phù hợp theo từng lead
- Cải thiện thông điệp marketing
- Đào tạo nhân viên theo insight thực tế của thị trường

---

## 10. Quy trình triển khai

### Giai đoạn 1: Chuẩn hóa dữ liệu

- Thu thập file booking, revenue, room type, country summary
- Chuẩn hóa schema dữ liệu
- Seed dữ liệu vào database

### Giai đoạn 2: Xây dựng backend và dashboard

- Xây API quản trị
- Xây dashboard doanh thu, alert, đối thủ
- Kết nối dữ liệu vào frontend

### Giai đoạn 3: Triển khai AI analytics

- Dynamic pricing
- Cancellation prediction
- Competitor insight
- Hotel intelligence

### Giai đoạn 4: Triển khai AI sales concierge

- Guest advisor
- Lead scoring
- Conversion playbook
- Multi-turn guest chat

### Giai đoạn 5: Tối ưu và đo lường

- Theo dõi KPI thực tế
- Tinh chỉnh prompt, business rules và playbook
- Mở rộng sang automation và gửi đa kênh

---

## 11. Kế hoạch triển khai theo giai đoạn

| Milestone | Hoạt động | Thời gian |
|---|---|---|
| 1 | Chuẩn hóa dữ liệu và xây database | Tuần 1-2 |
| 2 | Xây backend API và dashboard cơ bản | Tuần 2-4 |
| 3 | Import competitor data và analytics | Tuần 4-5 |
| 4 | Tích hợp predictive AI | Tuần 5-6 |
| 5 | Tích hợp AI sales concierge | Tuần 6-8 |
| 6 | Kiểm thử, tối ưu, đào tạo sử dụng | Tuần 8-9 |

---

## 12. Đo lường hiệu quả

Các chỉ số cần theo dõi:

- Tỷ lệ phản hồi tự động thành công
- Thời gian phản hồi trung bình
- Tỷ lệ booking chuyển đổi
- Tỷ lệ booking hủy
- Doanh thu upsell
- ADR trung bình
- Tỷ lệ lead hot/warm/cold
- Tỷ lệ nhân viên sử dụng suggestion của AI
- Mức độ hài lòng của khách sau tương tác

KPI kỳ vọng:

- Giảm thời gian phản hồi xuống dưới 1 phút
- Tăng tỷ lệ conversion trực tiếp 5-12%
- Tăng doanh thu upsell 8-15%
- Giảm booking hủy ở nhóm nguy cơ cao
- Giảm tải 30-50% cho bộ phận reservation/CSKH

---

## 13. Chi phí dự kiến

Tùy quy mô, có thể chia thành các nhóm chi phí:

| Hạng mục | Chi phí ước tính |
|---|---|
| Chuẩn hóa dữ liệu và triển khai database | 10 - 20 triệu |
| Xây backend và dashboard | 20 - 40 triệu |
| Tích hợp AI analytics | 15 - 30 triệu |
| Tích hợp AI sales concierge | 20 - 35 triệu |
| Hạ tầng vận hành / model / API | 5 - 15 triệu / tháng |
| Đào tạo và chuyển giao | 5 - 10 triệu |
| Tổng | 70 - 150 triệu |

Ghi chú:

- Nếu dùng Ollama local, chi phí API có thể giảm mạnh
- Nếu dùng cloud model mạnh hơn, chi phí inference sẽ tăng
- Có thể triển khai MVP trước rồi mở rộng theo giai đoạn

---

## 14. Rủi ro và giải pháp

| Rủi ro | Mức ảnh hưởng | Giải pháp |
|---|---|---|
| Dữ liệu lịch sử thiếu chuẩn | Cao | Chuẩn hóa ETL và validation trước khi đưa vào AI |
| AI tư vấn chưa đúng ngữ cảnh khách sạn | Trung bình | Tinh chỉnh prompt + bổ sung knowledge base |
| Đội vận hành chưa quen dùng AI | Trung bình | Đào tạo theo vai trò và làm playbook nội bộ |
| Dữ liệu đối thủ thiếu ổn định | Trung bình | Dùng import pipeline định kỳ và fallback heuristic |
| Lead scoring chưa đủ chính xác giai đoạn đầu | Trung bình | Hiệu chỉnh rule dựa trên dữ liệu thực tế |
| Người dùng muốn nói chuyện với người thật | Trung bình | Có cơ chế handoff sang nhân viên |
| Chi phí vận hành AI tăng | Cao | Phân tầng model, cache, rule-based fallback |

---

## 15. Duy trì và vận hành hệ thống

### 15.1 Duy trì tri thức AI

- Cập nhật chính sách giá, combo, khuyến mãi
- Cập nhật script chăm sóc khách
- Bổ sung dữ liệu review và đối thủ
- Tinh chỉnh prompt định kỳ

### 15.2 Giám sát hiệu suất

- Theo dõi log chat và phản hồi lỗi
- Kiểm tra endpoint AI
- Đo lead score so với tỷ lệ close thực tế
- So sánh dynamic pricing với kết quả doanh thu

### 15.3 Vận hành đa nền tảng

Trong tương lai, hệ thống có thể mở rộng:

- Website booking engine
- Zalo OA
- Facebook Messenger
- WhatsApp
- CRM nội bộ
- Email marketing automation

### 15.4 Nguyên tắc vận hành

- AI xử lý truy vấn đơn giản và bán tự động
- Nhân viên xử lý ca phức tạp
- Dashboard là nơi giám sát, điều chỉnh và ra quyết định
- Dữ liệu được dùng để tối ưu liên tục, không vận hành theo cảm tính

---

## 16. Kết luận

`Hotel AI Command Center` không chỉ là một dashboard quản lý khách sạn, mà là một hệ thống AI hỗ trợ doanh nghiệp lưu trú ra quyết định bằng dữ liệu, tăng hiệu quả bán hàng và nâng cao trải nghiệm khách hàng.

Giá trị cốt lõi của hệ thống nằm ở việc kết hợp:

- dữ liệu booking nội bộ
- dữ liệu đối thủ ngoài thị trường
- AI phân tích
- AI tư vấn
- AI hỗ trợ chốt sale

Nếu được triển khai đúng cách, hệ thống có thể giúp khách sạn:

- phản ứng nhanh hơn với thị trường
- giảm phụ thuộc vào xử lý thủ công
- tăng chuyển đổi
- tăng upsell
- và xây dựng một mô hình vận hành hiện đại dựa trên dữ liệu và AI

---

## 17. Phụ lục: định hướng app khách & up sell (sau phiên họp)

Team đã chốt hướng mở rộng sang **ứng dụng một nền tảng** cho khách (đặt phòng, check-in, mobile key, room service, thanh toán) kèm **up sell** và **cá nhân hóa**; phạm vi giao diện mong muốn **hai chiều** (chủ khách sạn xem dữ liệu + khách dùng app), với **ưu tiên MVP là luồng khách** nếu phải chọn một.

Chi tiết backlog copy mẫu, từng loại up sell và ý tích hợp Spotify / quà sinh nhật được ghi trong tài liệu riêng: [`DINH_HUONG_APP_KHACH_HOTEL.md`](./DINH_HUONG_APP_KHACH_HOTEL.md).

