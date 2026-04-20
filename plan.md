# Kế hoạch triển khai cấu trúc Portfolio

Dựa trên yêu cầu và hai hình ảnh mẫu bạn cung cấp, trang Portfolio sẽ được chia thành các phần chính mang phong cách Dark Mode hiện đại, với hiệu ứng nền mạng lưới hạt (particles).

## Mục tiêu giao diện (Dựa theo ảnh mẫu)

1. **Nền trang (Background):** Nền đen kèm hiệu ứng động (các đường nối mạng lưới - network particles).
2. **Khu vực Hero (Giới thiệu):**
   - Tiêu đề chính chứa tên bạn: **Nguyễn Minh Danh**. _(Lưu ý: trên nền đen, chữ nên là màu trắng hoặc màu sáng để dễ đọc, "đen" có thể bạn ý nói chữ đậm hoặc nền đen)_.
   - Chữ phụ (Subtitle): Mô tả ngắn (VD: "An editor also a coder.").
   - Avatar góc phải bên trong khung tròn.
   - Các nút mạng xã hội (Facebook, Youtube/Github, v.v.).
3. **Khu vực Coding (Dự án):**
   - Tiêu đề "Coding".
   - Dạng lưới (Grid layout) hiển thị các thẻ dự án (Project Cards).
   - Mỗi thẻ gồm: Hình ảnh minh họa, Tiêu đề (có icon), mô tả, 2 nút "View Project" và "Repository".
4. **Footer (Chân trang):**
   - Dòng chữ căn giữa: `© 2026 Nguyễn Minh Danh - All Rights Reserved.`

---

## Các thay đổi dự kiến

### 1. Cài đặt thư viện hỗ trợ

Để tạo hiệu ứng nền lưới nhện động giống ảnh, chúng ta nên dùng thư viện `react-tsparticles`.

- Dự kiến chạy: `npm install react-tsparticles tsparticles` ngoài terminal.

### 2. Cấu trúc Component

Sẽ chia nhỏ dự án theo các phần gọn gàng:

#### [NEW] `src/components/Background.jsx`

- Chứa logic và giao diện cho phần nền động (Particles). Nền này sẽ nằm bám dưới cùng (`z-index: -1`).

#### [NEW] `src/components/Hero.jsx`

- Phần giới thiệu ở đầu trang (Chứa thông tin Nguyễn Minh Danh, social links, và Avatar).

#### [NEW] `src/components/Projects.jsx`

- Phần danh sách thẻ, chia Layout dạng Grid.
- Định nghĩa luôn dữ liệu giả (Mock data) cho các project để render ra giống hệt trong hình ảnh.

#### [NEW] `src/components/Footer.jsx`

- Đoạn text Footer nhỏ nhắn ở cuối cùng.

#### [MODIFY] `src/App.jsx`

- Lắp ráp tất cả các Components trên lại với nhau theo thứ tự:
  ```jsx
  <Background />
  <div className="content-wrapper">
    <Hero />
    <Projects />
    <Footer />
  </div>
  ```

#### [MODIFY] `src/App.css` (hoặc index.css)

- Xóa các code demo hiện tại, viết lại toàn bộ CSS cho: Layout tổng, Grid cho thẻ dự án, style cho từng Card và CSS cho Background.

---

## ⚠️ Câu hỏi mở cần bạn xác nhận (Cần review)

> [!IMPORTANT]
>
> 1. **Hiệu ứng nền động:** Bạn có đồng ý cài đặt thư viện `tsparticles` để tạo hiệu ứng các hạt lưới (network/constellation) di chuyển y hệt trong ảnh không?
> 2. **Màu chữ Tên:** Bạn viết "tên tôi Nguyễn Minh Danh đen" - trên nền tối thì chữ đen sẽ không thấy được. Ý bạn là chữ lớn in đậm (Bold) hay thiết kế nền sáng chữ đen cho phần đó? Theo hình thì nền đen chữ trắng. Tôi sẽ làm viền ngoài cho chữ đậm hoặc trắng sáng như ảnh nha.
> 3. **Hình ảnh Project:** Hiện tại tôi sẽ dùng các vùng màu hoặc link ảnh placeholder để thay thế cho ảnh dự án. Sau đó bạn có thể tự thay link thật vào nhé.

---

## Kế hoạch kiểm tra

1. Kiểm tra hiệu ứng nền có lấp đầy màn hình và chạy mượt không.
2. Kiểm tra phần cuộn chuột (Scroll) xuống khu vực Coding.
3. Responsive: Trên điện thoại, danh sách Projects phải hiển thị 1 cột.
