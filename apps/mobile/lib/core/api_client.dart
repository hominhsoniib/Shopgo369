import 'package:dio/dio.dart';
import 'constants.dart';
import 'secure_storage.dart';

/// ApiClient dùng chung toàn app — tự động gắn Bearer token, tự động
/// refresh khi access token hết hạn (401), giống cơ chế trên Web
/// (apps/web/lib/api-client.ts) để đảm bảo hành vi NHẤT QUÁN giữa Web & Mobile.
class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final _storage = SecureStorageService();

  ApiClient._internal() {
    dio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl, connectTimeout: const Duration(seconds: 10)));

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // Access token hết hạn (401) — thử refresh 1 lần rồi gọi lại request gốc
          if (error.response?.statusCode == 401) {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              final retryResponse = await dio.fetch(error.requestOptions);
              return handler.resolve(retryResponse);
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  Future<bool> _tryRefreshToken() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await dio.post('/auth/refresh', data: {'refreshToken': refreshToken});
      await _storage.saveTokens(
        accessToken: response.data['accessToken'],
        refreshToken: response.data['refreshToken'],
      );
      return true;
    } catch (_) {
      await _storage.clear();
      return false;
    }
  }
}
