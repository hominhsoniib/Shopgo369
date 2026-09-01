import 'package:flutter/material.dart';
import 'app_router.dart';
import 'theme.dart';

/// 369 Platform — Mobile App entry point (Mục 12 spec: dùng chung API với Web,
/// không viết lại backend). Chạy: flutter run --dart-define=API_BASE_URL=...
void main() {
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
