import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/secure_storage.dart';
import '../../core/push/fcm_service.dart';

/// Màn hình đăng nhập — gọi CÙNG endpoint /auth/login với Web
/// (apps/web/app/(auth)/login/page.tsx) — hành vi backend nhất quán.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _storage = SecureStorageService();
  String? _error;
  bool _loading = false;

  Future<void> _handleLogin() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final response = await ApiClient().dio.post('/auth/login', data: {
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
      });
      final data = response.data as Map<String, dynamic>;

      // Tài khoản đã bật 2FA (bắt buộc với Admin/Super Admin, tự nguyện với
      // vai trò khác) — backend CHƯA trả token thật, chỉ trả tempToken sống
      // 5 phút. Phải sang bước 2 nhập mã OTP trước khi có accessToken.
      if (data['requiresTwoFactor'] == true) {
        final tempToken = data['tempToken'] as String;
        if (mounted) context.push('/login/2fa', extra: tempToken);
        return;
      }

      final user = data['user'] as Map<String, dynamic>?;
      await _storage.saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
        twoFactorEnabled: user?['twoFactorEnabled'] as bool? ?? false,
      );
      // P4 — đăng ký device token cho push NGAY sau khi có accessToken.
      // Không await chặn điều hướng — chạy nền, tự nuốt lỗi (xem FcmService).
      unawaited(FcmService.instance.registerCurrentDevice());
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => _error = 'Đăng nhập thất bại — kiểm tra lại email/mật khẩu');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('369', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.red)),
              const SizedBox(height: 32),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                decoration: const InputDecoration(labelText: 'Mật khẩu', border: OutlineInputBorder()),
                obscureText: true,
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.all(14)),
                  child: _loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Đăng nhập', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
