import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'app_router.dart';
import 'theme.dart';
import 'firebase_options.dart';
import 'core/push/fcm_service.dart';

/// 369 Platform — Mobile App entry point (Mục 12 spec: dùng chung API với Web,
/// không viết lại backend). Chạy: flutter run --dart-define=API_BASE_URL=...
///
/// P4 — `firebase_options.dart` KHÔNG có sẵn trong repo (chứa API key theo
/// từng project Firebase, không nên commit cứng) — sinh ra bằng lệnh
/// `flutterfire configure` chạy tại `apps/mobile` (xem docstring đầy đủ ở
/// `lib/core/push/fcm_service.dart`). Nếu file này chưa tồn tại, app sẽ
/// KHÔNG build được cho tới khi bạn chạy lệnh đó — đây là bước dựng 1 lần,
/// giống hệt việc phải chạy `prisma generate` trước khi build backend.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    await FcmService.instance.init();
  } catch (e) {
    // Không chặn app chạy nếu Firebase chưa cấu hình xong — người dùng vẫn
    // dùng được toàn bộ tính năng khác, chỉ không nhận được push.
    debugPrint('Firebase init lỗi (push notification sẽ không hoạt động): $e');
  }

  runApp(const Platform369App());
}

class Platform369App extends StatelessWidget {
  const Platform369App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '369',
      debugShowCheckedModeBanner: false,
      theme: appTheme,
      routerConfig: appRouter,
    );
  }
}
