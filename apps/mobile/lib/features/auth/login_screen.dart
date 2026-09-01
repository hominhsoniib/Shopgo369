import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/secure_storage.dart';

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
      await _storage.saveTokens(
        accessToken: response.data['accessToken'],
        refreshToken: response.data['refreshToken'],
      );
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
