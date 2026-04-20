# Kế hoạch chỉnh sửa giao diện & Scroll Animation (Plan 2)

## 1. Cập nhật thẻ Hero (Giới thiệu) & Header
- **Header:** Thêm địa chỉ email `Macter.970@gmail.com` vào thanh điều hướng tĩnh (Header) ở trên cùng.
- **Hero:** Đổi tên hiển thị từ "I'm IzukiNo!" thành **"I'm Danh"**.
- **Hero:** Đổi mô tả (subtitle) từ "An editor also a coder." thành **"IT Student @ HUFLIT | Backend Developer & Mobile Enthusiast"**.
- **Hero Avatar:** Thêm hiệu ứng hover cho ảnh đại diện, khi di chuột vào ảnh sẽ **to lên một chút (scale)** và **nghiêng qua một bên (rotate)**.

## 2. Hiệu ứng cuộn trang (Scroll Snapping)
- Chuyển thao tác cuộn thông thường thành hiệu ứng **Full-page Snap** (cuộn phát là tự động khấc qua trang/section mới).
- Điều chỉnh chiều cao của phần Hero sao cho người dùng khi vừa vào web sẽ **thấy "lấp ló" chữ Coding** ở bên dưới vạch màn hình, báo hiệu cho họ biết là có nội dung bên dưới để cuộn.
- **Kỹ thuật:** Áp dụng `scroll-snap-type: y mandatory` vào container tổng, và `scroll-snap-align: start` cho các sections.

## 3. Hiệu ứng xuất hiện cho các Card Profile (Scroll Animation)
- Áp dụng kỹ thuật `Intersection Observer` (theo dõi phần tử trên màn hình).
- Khi người dùng cuộn (snap) xuống phần Coding, các Card dự án sẽ từ từ lướt hiện lên (fade-in-up) một cách mượt mà theo tuần tự (staggered animation).

## 4. Xóa Mock Data của Project Cards
- Xóa toàn bộ dữ liệu giả định 5 project đang hiển thị.
- Để lại giao diện cấu trúc chuẩn HTML/CSS (hoặc một mảng rỗng) nhưng không hiển thị thẻ nào ra màn hình báo sẵn để sau này bạn chỉ việc "nhồi" data của bạn vào là chạy mượt mà ngay.

--- 

Bạn hãy kiểm tra xem kế hoạch sửa đổi này đã đúng với toàn bộ mong muốn của bạn chưa nhé. Nếu OK thì tôi sẽ bắt tay vào code!
