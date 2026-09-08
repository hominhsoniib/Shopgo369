// GENERATED PLACEHOLDER — file này sẽ bị GHI ĐÈ HOÀN TOÀN khi bạn chạy:
//   dart pub global activate flutterfire_cli
//   cd apps/mobile && flutterfire configure
//
// Trước khi chạy lệnh trên, app vẫn BUILD được bình thường — chỉ riêng
// `Firebase.initializeApp()` ở main.dart sẽ throw UnsupportedError bên dưới,
// và được bắt (catch) ở main.dart để KHÔNG làm crash toàn bộ app (chỉ push
// notification không hoạt động, mọi tính năng khác vẫn dùng được).
//
// KHÔNG tự tay sửa nội dung throw bên dưới thành API key thật — luôn dùng
// `flutterfire configure` để sinh đúng, tránh gõ nhầm project id/app id.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'firebase_options.dart chưa được cấu hình — chạy `flutterfire configure` tại apps/mobile.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
        throw UnsupportedError(
          'firebase_options.dart chưa được cấu hình — chạy `flutterfire configure` tại apps/mobile '
          '(xem hướng dẫn đầy đủ trong lib/core/push/fcm_service.dart).',
        );
      default:
        throw UnsupportedError('Nền tảng này chưa được FlutterFire hỗ trợ cấu hình.');
    }
  }
}
