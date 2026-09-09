import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Lưu accessToken/refreshToken bằng Keychain (iOS) / Keystore (Android) —
/// KHÔNG dùng SharedPreferences cho token nhạy cảm (Mục 7.2 spec: bảo mật).
class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  static const _accessTokenKey = 'accessToken';
  static const _refreshTokenKey = 'refreshToken';
  // Cache trạng thái 2FA của tài khoản hiện tại — lấy từ field `user.twoFactorEnabled`
  // do backend trả về ở /auth/login (khi không cần 2FA) và /auth/2fa/verify-login.
  // Chỉ dùng để khởi tạo đúng bước hiển thị ở màn hình Cài đặt 2FA (tránh bug
  // luôn hiển thị "chưa bật" như trang Web /admin/security hiện đang gặp);
  // KHÔNG dùng cache này để quyết định logic bảo mật nào khác.
  static const _twoFactorEnabledKey = 'twoFactorEnabledCache';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    bool? twoFactorEnabled,
  }) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
    if (twoFactorEnabled != null) {
      await _storage.write(key: _twoFactorEnabledKey, value: twoFactorEnabled.toString());
    }
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<bool> getTwoFactorEnabledCache() async {
    final value = await _storage.read(key: _twoFactorEnabledKey);
    return value == 'true';
  }

  Future<void> setTwoFactorEnabledCache(bool enabled) async {
    await _storage.write(key: _twoFactorEnabledKey, value: enabled.toString());
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
    await _storage.delete(key: _twoFactorEnabledKey);
  }
}
