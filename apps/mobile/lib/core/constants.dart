/// Cấu hình chung — Mobile app gọi CÙNG 1 API NestJS với Web (Mục 12 spec:
/// "API 369 → Next.js Web, Flutter Android, Flutter iOS — không phải viết
/// lại backend"). Đổi baseUrl theo môi trường build (dev/staging/production).
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api/v1', // 10.0.2.2 = localhost khi chạy Android Emulator
  );
}
