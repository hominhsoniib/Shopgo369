import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/secure_storage.dart';
import '../../core/push/fcm_service.dart';

/// Bước 2 của đăng nhập khi tài khoản đã bật 2FA (Admin/Super Admin bắt
/// buộc, vai trò khác tự nguyện). Nhận `tempToken` (JWT sống 5 phút, KHÔNG
/// dùng được cho endpoint nào khác) từ [LoginScreen] qua `extra`, đổi lấy
/// mã OTP 6 số để nhận token thật — CÙNG endpoint với Web
/// (`POST /auth/2fa/verify-login`, apps/web/app/(auth)/login/page.tsx).
class TwoFactorVerifyScreen extends StatefulWidget {
  const TwoFactorVerifyScreen({super.key, required this.tempToken});

  final String tempToken;

  @override
  State<TwoFactorVerifyScreen> createState() => _TwoFactorVerifyScreenState();
}

class _TwoFactorVerifyScreenState extends State<TwoFactorVerifyScreen> {
  final _codeController = TextEditingController();
  final _storage = SecureStorageService();
  String? _error;
  bool _loading = false;

  Future<void> _handleVerify() async {
    if (_codeController.text.length != 6 || _loading) return;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final response = await ApiClient().dio.post('/auth/2fa/verify-login', data: {
        'tempToken': widget.tempToken,
        'code': _codeController.text,
      });
      final data = response.data as Map<String, dynamic>;
      await _storage.saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
        // Vào được tới đây nghĩa là 2FA chắc chắn đang bật cho tài khoản này.
        twoFactorEnabled: true,
      );
      unawaited(FcmService.instance.registerCurrentDevice());
      if (mounted) context.go('/');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Mã xác thực không đúng, hoặc phiên đã hết hạn (5 phút) — thử lại hoặc quay về đăng nhập.';
        _codeController.clear();
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Xác thực 2 lớp'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Quay về đăng nhập',
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.shield_outlined, size: 56, color: Colors.red),
              const SizedBox(height: 16),
              const Text(
                'Nhập mã 6 số từ ứng dụng authenticator',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              const Text(
                'Tài khoản này đã bật xác thực 2 lớp (2FA).',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _codeController,
                autofocus: true,
                enabled: !_loading,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                style: const TextStyle(fontSize: 22, letterSpacing: 8, fontWeight: FontWeight.bold),
                decoration: const InputDecoration(
                  counterText: '',
                  border: OutlineInputBorder(),
                  hintText: '••••••',
                ),
                onChanged: (v) {
                  setState(() {}); // cập nhật trạng thái nút Xác nhận
                  if (v.length == 6) _handleVerify();
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontSize: 13)),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: (_loading || _codeController.text.length != 6) ? null : _handleVerify,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.all(14)),
                child: _loading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Xác nhận', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
