import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Lưu accessToken/refreshToken bằng Keychain (iOS) / Keystore (Android) —
/// KHÔNG dùng SharedPreferences cho token nhạy cảm (Mục 7.2 spec: bảo mật).
class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  static const _accessTokenKey = 'accessToken';
  static const _refreshTokenKey = 'refreshToken';

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
