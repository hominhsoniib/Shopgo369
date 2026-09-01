# 369 Platform — Mobile App (Flutter, Phase 6)

Dùng CHUNG API NestJS với Web (`apps/api`) — không viết lại backend (Mục 12 spec).
Không có màn hình nào gọi API riêng cho mobile; toàn bộ endpoint đã build ở Phase 1-5.

## Cấu trúc

```
lib/
├── main.dart              # Entry point
├── app_router.dart        # go_router — ánh xạ theo URL Web (Mục 5.4 spec)
├── theme.dart
├── core/
│   ├── api_client.dart    # Dio + tự động refresh token khi 401
│   ├── secure_storage.dart# Lưu token bằng Keychain/Keystore
│   └── constants.dart
├── models/                # Product, OrderSummary
└── features/
    ├── auth/login_screen.dart
    ├── shop/home_screen.dart, product_detail_screen.dart
    ├── cart/cart_screen.dart, checkout_screen.dart
    ├── orders/orders_list_screen.dart, order_detail_screen.dart
    └── seller/seller_dashboard_screen.dart (rút gọn từ Phase 3)
```

## Chạy thử

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1   # Android Emulator
# iOS Simulator dùng http://localhost:4000/api/v1 thay vì 10.0.2.2
```

## ⚠️ Giới hạn Phase 6 (đã cố ý giữ scope gọn — xem để hoàn thiện tiếp)

- **Chưa verify build được** — môi trường tạo scaffold này không có Flutter SDK cài sẵn, chỉ viết code theo đúng convention Dart/Flutter chuẩn. Cần chạy `flutter analyze` + `flutter pub get` trên máy thật trước khi tin tưởng biên dịch sạch 100%.
- Chưa có Android/iOS native project shell (`android/`, `ios/`) — cần chạy `flutter create .` tại thư mục `apps/mobile` để Flutter tự sinh 2 thư mục này, sau đó merge lại `pubspec.yaml` đã viết sẵn.
- Thanh toán online (VNPay/Momo) mới dừng ở bước gọi `/payments/:id/init` — chưa tích hợp SDK/WebView thanh toán thật.
- State management dùng `setState` cơ bản cho từng screen (đủ cho Phase 6 MVP) — khi app phức tạp hơn nên chuyển sang `provider`/`riverpod` có cấu trúc rõ ràng hơn (đã thêm `provider` vào `pubspec.yaml` sẵn để nâng cấp sau).
- Push Notification (Mục 11 spec: `notification_logs`) chưa tích hợp Firebase Cloud Messaging.
- Chưa có màn hình Member Profile/Referral/Points/Learning (Phase 5 backend đã có API đầy đủ, chỉ còn thiếu UI mobile — có thể bổ sung nhanh theo mẫu các screen đã có).
