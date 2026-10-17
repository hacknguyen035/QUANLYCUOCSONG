# LifeOS - Quản Lý Đời Sống & Tài Chính Cá Nhân Toàn Diện (Personal Life OS)

> Ứng dụng web Progressive Web App (PWA) hiện đại, bảo mật tuyệt đối 100% Client-Side với mã hóa **PBKDF2 + AES-GCM 256-bit**, tối ưu hiển thị mượt mà trên cả Điện thoại (Mobile-First) và Máy tính.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. Dashboard Tổng quan (Trang chủ)
- **Lời chào theo buổi trong ngày:** Tự động chào buổi sáng, trưa, chiều, tối kèm thời gian thực tế.
- **Tóm tắt số dư & Dòng tiền:** Tổng tài sản các ví, tổng thu nhập tháng, tổng chi tiêu tháng, dòng tiền ròng.
- **Bảo mật nơi công cộng:** Nút bật/tắt mắt ẩn số dư nhanh (`••••••`).
- **Snapshot tiến độ:** Thống kê việc cần làm hôm nay, tiến độ thói quen (Habits progress) và cảnh báo hóa đơn sắp đến hạn.

### 2. Quản lý Tài chính & Ngân hàng Thông minh
- **Quản lý đa ví:** Vietcombank, Techcombank, MBBank, ACB, Tiền mặt... (chỉ lưu tên ngân hàng và số dư, tuyệt đối không yêu cầu số tài khoản nhạy cảm).
- **Smart SMS / App Notification Parser:**
  - Ô dán nhanh tin nhắn biến động số dư từ các ngân hàng Việt Nam (VCB, TCB, MB, ACB, BIDV, VPBank, TPBank...).
  - Tự động bóc tách: Số tiền (+/-), Thời gian, Nội dung, Số dư sau giao dịch.
  - Tự động nhận diện ngân hàng và khớp với ví tương ứng.
  - Tự động phân loại danh mục (Ăn uống, Mua sắm, Di chuyển, Hóa đơn, Lương...).
  - Tự động cập nhật số dư ví sau khi xác nhận.
- **Nhập file Sao kê (CSV / Excel Import):**
  - Kéo-thả trực tiếp file `.xlsx`, `.xls`, `.csv` sao kê ngân hàng vào trình duyệt.
  - Xử lý 100% client-side bằng SheetJS, tự động nhận diện cột Ngày, Nội dung, Thu/Chi, Số dư.
  - Bảng xem trước kèm hộp kiểm (checkbox) và nhãn danh mục để chọn lọc trước khi lưu vào sổ.
- **Biểu đồ trực quan (Chart.js):**
  - Biểu đồ tròn (Doughnut) phân bổ chi tiêu theo từng danh mục trong tháng.
  - Biểu đồ cột (Bar chart) dòng tiền so sánh Thu vs Chi qua 6 tháng gần nhất.

### 3. Quản lý Công việc & Lịch trình (To-Do & Daily Planner)
- Danh sách việc cần làm trong ngày với checkbox hoàn thành kèm hiệu ứng pháo hoa ăn mừng (Confetti).
- **Ma trận Eisenhower (4 Góc phân loại):**
  - Khẩn cấp & Quan trọng (Làm ngay).
  - Quan trọng, Không khẩn cấp (Lên lịch).
  - Khẩn cấp, Không quan trọng (Ủy quyền / Làm nhanh).
  - Không khẩn cấp, Không quan trọng (Loại bỏ).
- **Nhắc lịch đóng Hóa đơn định kỳ:**
  - Quản lý tiền điện EVN, nước sinh hoạt, cước internet, dư nợ thẻ tín dụng...
  - Tự động đếm ngược số ngày còn lại đến hạn trong tháng, gắn cờ cảnh báo quá hạn.
  - Bấm "Xác nhận đã trả" có tùy chọn tự động ghi nhận một giao dịch chi tiêu vào Sổ Tài chính!

### 4. Theo dõi Thói quen & Sức khỏe (Habit Tracker)
- Danh sách thói quen (Uống 2L nước, Tập thể dục, Đọc sách, Ngủ sớm...).
- **Chuỗi ngày liên tiếp (Streak):** Tự động đếm chuỗi ngày duy trì kỷ luật với biểu tượng lửa 🔥.
- **Thanh lịch tuần 7 ngày (Weekly Strip):** Bấm tích hoàn thành trực tiếp cho từng ngày trong tuần.

### 5. Sổ tay Ghi chú & Mua sắm (Notes & Shopping List)
- **Sổ tay ghi chú nhanh:** Lưu ý tưởng, kế hoạch kèm tính năng ghim lên đầu (Pin).
- **Checklist mua sắm siêu thị:**
  - Nhập tên món đồ, số lượng, giá ước tính.
  - Tích chọn khi đã nhặt đồ vào giỏ.
  - Thanh tổng kết thông minh: Tổng dự tính | Đã mua | Còn lại.

---

## 🔒 KIẾN TRÚC BẢO MẬT & DỮ LIỆU (100% CLIENT-SIDE)

1. **Chuẩn mã hóa Web Crypto API:**
   - **PBKDF2:** Sử dụng SHA-256 với **150.000 vòng lặp** (iterations) và Salt ngẫu nhiên 16 bytes để tạo khóa mã hóa AES từ Master Password của bạn.
   - **AES-GCM 256-bit:** Dữ liệu JSON được mã hóa hoàn toàn trước khi lưu vào `localStorage`. Trình duyệt hay bất kỳ ai mở F12 DevTools đều chỉ thấy chuỗi mã hóa vô nghĩa (Ciphertext).
2. **Khóa màn hình tự động (Idle Auto-Lock):**
   - Tự động khóa sau 5 phút không có thao tác (chuột, bàn phím, chạm màn hình).
   - Nút "Khóa ngay" trên thanh tiêu đề để khóa ứng dụng tức thì khi có người lại gần.
3. **Chống mất dữ liệu & Chuyển đổi thiết bị:**
   - **Xuất file Sao lưu (.enc):** Xuất toàn bộ dữ liệu dưới dạng file đã mã hóa để lưu vào Google Drive, iCloud hoặc USB.
   - **Khôi phục từ file (.enc):** Nạp lại dữ liệu trên bất kỳ máy tính/điện thoại nào khác chỉ bằng Master Password.
   - **File System Access API:** Hỗ trợ trên Chrome/Edge máy tính để chọn 1 file sao lưu trên ổ cứng, ứng dụng sẽ tự động ghi đè mỗi khi có thay đổi dữ liệu!
4. **Cấu hình an toàn cho GitHub (.gitignore):**
   - Đã tạo sẵn `.gitignore` chặn toàn bộ file `.csv`, `.xlsx`, `.xls`, `.json`, `.enc`, `.env`.

---

## 📱 CÁCH CÀI ĐẶT PWA LÀM APP TRÊN ĐIỆN THOẠI & MÁY TÍNH

Ứng dụng hỗ trợ đầy đủ tiêu chuẩn **Progressive Web App (PWA)**:

- **Trên iPhone / iPad (Safari):**
  1. Mở trang web trên trình duyệt Safari.
  2. Bấm nút **Chia sẻ (Share)** (biểu tượng ô vuông có mũi tên chỉ lên ở thanh công cụ dưới đáy).
  3. Cuộn xuống và chọn **"Thêm vào Màn hình chính" (Add to Home Screen)**.
  4. Đặt tên "LifeOS" và bấm Thêm. Giờ bạn có thể mở ứng dụng toàn màn hình mà không có thanh địa chỉ Safari!

- **Trên Android (Chrome):**
  1. Mở trang web trên Google Chrome.
  2. Bấm vào biểu tượng dấu 3 chấm góc phải trên cùng.
  3. Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào Màn hình chính" (Add to Home screen)**.

- **Trên Máy tính (Chrome / Edge / Brave):**
  1. Nhìn vào góc phải thanh địa chỉ URL sẽ thấy biểu tượng máy tính có mũi tên tải xuống (Install LifeOS).
  2. Bấm **Cài đặt (Install)** để mở LifeOS trong cửa sổ độc lập như một phần mềm Desktop thật sự.

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI (DEPLOY) LÊN GITHUB PAGES & VERCEL

### Cách 1: Triển khai lên GitHub Pages (Miễn phí 100%)
1. Tạo một repository mới trên GitHub (ví dụ: `personal-life-os`).
2. Khởi tạo và đẩy code lên:
   ```bash
   git init
   git add .
   git commit -m "Initial commit LifeOS"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/personal-life-os.git
   git push -u origin main
   ```
3. Truy cập vào Repository trên GitHub -> vào tab **Settings** -> mục **Pages**.
4. Tại phần **Build and deployment** > **Branch**, chọn nhánh `main` và thư mục `/(root)`, sau đó bấm **Save**.
5. Sau 1-2 phút, bạn sẽ nhận được đường dẫn trang web dạng: `https://<tai-khoan>.github.io/personal-life-os/`.

### Cách 2: Triển khai lên Vercel
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Bấm **"Add New Project"** và chọn repository `personal-life-os`.
3. Giữ nguyên toàn bộ cấu hình mặc định và bấm **"Deploy"**.
4. Vercel sẽ cung cấp tên miền miễn phí cực nhanh có hỗ trợ HTTPS (bắt buộc để PWA và Web Crypto hoạt động tối đa).
