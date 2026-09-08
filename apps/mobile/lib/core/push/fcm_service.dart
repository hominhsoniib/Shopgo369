import 'dart:developer' as developer;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import '../api_client.dart';
import '../../app_router.dart';

/// FcmService — singleton quản lý toàn bộ vòng đời push notification, cùng
/// pattern singleton với `ApiClient` (Mục P4: backend đã có module
/// `notification`, đây là phần mobile kết nối vào).
///
/// YÊU CẦU TRƯỚC KHI DÙNG (bắt buộc, chưa làm được từ sandbox):
///   1. Tạo Firebase project tại https://console.firebase.google.com
///   2. Cài FlutterFire CLI: `dart pub global activate flutterfire_cli`
///   3. Chạy tại `apps/mobile`: `flutterfire configure` — lệnh này TỰ ĐỘNG
///      sinh ra `lib/firebase_options.dart`, thêm `google-services.json`
///      (Android) và `GoogleService-Info.plist` (iOS), và gắn plugin
///      Gradle/Xcode cần thiết — KHÔNG tự tay sửa các file native.
///   4. Backend: set `FIREBASE_SERVICE_ACCOUNT_JSON` (xem `.env.example`).
class FcmService {
  FcmService._internal();
  static final FcmService instance = FcmService._internal();

  final _messaging = FirebaseMessaging.instance;
  bool _initialized = false;

  /// Gọi 1 lần khi app khởi động (main.dart) — SAU khi `Firebase.initializeApp()`
  /// đã chạy xong. An toàn để gọi kể cả khi user CHƯA đăng nhập — chỉ đăng ký
  /// token với backend ở bước `registerCurrentDevice()` (cần accessToken).
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      await _messaging.requestPermission(alert: true, badge: true, sound: true);

      // Foreground: app đang mở sẵn — hiện tại chỉ log, KHÔNG tự show local
      // notification (Mục thiết kế: tránh thêm dependency flutter_local_notifications
      // ở P4 này; nội dung vẫn nằm trong "Danh sách thông báo" trong app qua
      // GET /notifications vì backend luôn ghi NotificationLog bất kể có gửi
      // push thành công hay không).
      FirebaseMessaging.onMessage.listen((message) {
        developer.log('Nhận push khi app đang mở: ${message.notification?.title}', name: 'FcmService');
      });

      // Người dùng bấm vào push khi app đang ở background → điều hướng
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // App bị đóng hẳn, mở lên TỪ việc bấm push
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) _handleNotificationTap(initialMessage);
    } catch (e) {
      developer.log('FcmService.init() lỗi (không chặn app chạy tiếp): $e', name: 'FcmService');
    }
  }

  void _handleNotificationTap(RemoteMessage message) {
    // Mục data trong push (xem notification.processor.ts phía backend) luôn
    // có templateCode/logId — điều hướng đơn giản: mọi push đều mở "/notifications",
    // người dùng bấm vào đúng dòng để xem chi tiết (tránh phải map templateCode
    // → route cụ thể ở P4 này, có thể bổ sung sau nếu cần điều hướng sâu hơn).
    appRouter.push('/notifications');
  }

  /// Gọi SAU khi đăng nhập thành công — lấy FCM token thiết bị hiện tại và
  /// đăng ký với backend (POST /notifications/device-tokens). Lỗi ở đây
  /// KHÔNG được chặn luồng đăng nhập — chỉ log, thử lại ở lần mở app sau.
  Future<void> registerCurrentDevice() async {
    try {
      final token = await _messaging.getToken();
      if (token == null) return;

      final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'IOS' : 'ANDROID';
      await ApiClient().dio.post('/notifications/device-tokens', data: {
        'token': token,
        'platform': platform,
      });
    } catch (e) {
      developer.log('Đăng ký device token thất bại (bỏ qua, không chặn login): $e', name: 'FcmService');
    }
  }

  /// Gọi khi đăng xuất — huỷ đăng ký token khỏi backend để không nhận nhầm
  /// thông báo của tài khoản cũ trên thiết bị dùng chung.
  Future<void> unregisterCurrentDevice() async {
    try {
      final token = await _messaging.getToken();
      if (token == null) return;
      await ApiClient().dio.delete('/notifications/device-tokens/$token');
    } catch (e) {
      developer.log('Huỷ đăng ký device token thất bại (bỏ qua): $e', name: 'FcmService');
    }
  }
}
