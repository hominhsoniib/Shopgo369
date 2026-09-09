import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api_client.dart';
import '../../core/secure_storage.dart';

/// Cài đặt Xác thực 2 lớp (2FA) trên Mobile — cùng 3 bước với Web
/// (apps/web/app/(admin)/admin/security/page.tsx): idle → setup (quét QR +
/// nhập mã xác nhận) → done (đã bật, có thể tắt bằng mật khẩu + mã OTP).
///
/// Khác Web ở 1 điểm: bước khởi tạo đọc trạng thái đã-bật-hay-chưa từ cache
/// cục bộ (lưu lúc đăng nhập, xem SecureStorageService) — Web hiện luôn
/// khởi tạo ở "idle" dù tài khoản đã bật thật, đây là bug đã biết bên Web,
/// Mobile không lặp lại lỗi này.
class TwoFactorSettingsScreen extends StatefulWidget {
  const TwoFactorSettingsScreen({super.key});

  @override
  State<TwoFactorSettingsScreen> createState() => _TwoFactorSettingsScreenState();
}

enum _Step { loading, idle, setup, done }

class _TwoFactorSettingsScreenState extends State<TwoFactorSettingsScreen> {
  final _storage = SecureStorageService();
  _Step _step = _Step.loading;

  String _qrCodeDataUrl = '';
  String _secret = '';
  final _enableCodeController = TextEditingController();
  final _disablePasswordController = TextEditingController();
  final _disableCodeController = TextEditingController();

  bool _loading = false;
  String? _message;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _enableCodeController.dispose();
    _disablePasswordController.dispose();
    _disableCodeController.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    final enabled = await _storage.getTwoFactorEnabledCache();
    if (!mounted) return;
    setState(() => _step = enabled ? _Step.done : _Step.idle);
  }

  Future<void> _handleSetup() async {
    setState(() {
      _error = null;
      _message = null;
      _loading = true;
    });
    try {
      final response = await ApiClient().dio.post('/auth/2fa/setup');
      final data = response.data as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _qrCodeDataUrl = data['qrCodeDataUrl'] as String? ?? '';
        _secret = data['secret'] as String? ?? '';
        _step = _Step.setup;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tạo được mã QR — thử lại sau.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleEnable() async {
    if (_enableCodeController.text.length != 6 || _loading) return;
    setState(() {
      _error = null;
      _message = null;
      _loading = true;
    });
    try {
      await ApiClient().dio.post('/auth/2fa/enable', data: {'code': _enableCodeController.text});
      await _storage.setTwoFactorEnabledCache(true);
      if (!mounted) return;
      setState(() {
        _message = 'Đã bật xác thực 2 lớp (2FA) thành công. Từ lần đăng nhập tiếp theo bạn sẽ cần nhập mã OTP.';
        _step = _Step.done;
        _enableCodeController.clear();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Mã xác thực không đúng — kiểm tra lại app authenticator hoặc đồng bộ giờ thiết bị.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleDisable() async {
    if (_loading) return;
    setState(() {
      _error = null;
      _message = null;
      _loading = true;
    });
    try {
      await ApiClient().dio.post('/auth/2fa/disable', data: {
        'password': _disablePasswordController.text,
        'code': _disableCodeController.text,
      });
      await _storage.setTwoFactorEnabledCache(false);
      if (!mounted) return;
      setState(() {
        _message = 'Đã tắt xác thực 2 lớp (2FA).';
        _step = _Step.idle;
        _disablePasswordController.clear();
        _disableCodeController.clear();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tắt được 2FA — kiểm tra lại mật khẩu và mã OTP.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _copySecret() async {
    await Clipboard.setData(ClipboardData(text: _secret));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã sao chép mã bí mật')));
  }

  Uint8List? get _qrBytes {
    if (_qrCodeDataUrl.isEmpty) return null;
    try {
      final base64Part = _qrCodeDataUrl.split(',').last;
      return base64Decode(base64Part);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bảo mật · Xác thực 2 lớp')),
      body: _step == _Step.loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Bắt buộc khuyến nghị cho tài khoản Admin/Super Admin — mỗi lần đăng nhập '
                  'cần thêm mã OTP 6 số từ ứng dụng authenticator (Google Authenticator, Authy, '
                  'Microsoft Authenticator...), ngay cả khi mật khẩu bị lộ.',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 16),
                if (_message != null) _Banner(text: _message!, color: Colors.green),
                if (_error != null) _Banner(text: _error!, color: Colors.red),
                if (_step == _Step.idle) _buildIdle(),
                if (_step == _Step.setup) _buildSetup(),
                if (_step == _Step.done) _buildDone(),
              ],
            ),
    );
  }

  Widget _buildIdle() {
    return ElevatedButton(
      onPressed: _loading ? null : _handleSetup,
      style: ElevatedButton.styleFrom(backgroundColor: Colors.black87, padding: const EdgeInsets.all(14)),
      child: _loading
          ? const SizedBox(
              height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : const Text('Bắt đầu bật 2FA', style: TextStyle(color: Colors.white)),
    );
  }

  Widget _buildSetup() {
    final qr = _qrBytes;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('1. Mở app authenticator trên điện thoại → quét mã QR bên dưới (hoặc nhập tay mã bí mật).'),
        const SizedBox(height: 12),
        if (qr != null)
          Center(
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(8)),
              child: Image.memory(qr, width: 200, height: 200, gaplessPlayback: true),
            ),
          ),
        const SizedBox(height: 12),
        InkWell(
          onTap: _copySecret,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    _secret,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(Icons.copy, size: 14, color: Colors.grey),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text('2. Nhập mã 6 số app vừa hiển thị để xác nhận:'),
        const SizedBox(height: 8),
        TextField(
          controller: _enableCodeController,
          enabled: !_loading,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          style: const TextStyle(fontSize: 20, letterSpacing: 6, fontWeight: FontWeight.bold),
          decoration: const InputDecoration(counterText: '', border: OutlineInputBorder(), hintText: '123456'),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: (_loading || _enableCodeController.text.length != 6) ? null : _handleEnable,
          style: ElevatedButton.styleFrom(backgroundColor: Colors.black87, padding: const EdgeInsets.all(14)),
          child: _loading
              ? const SizedBox(
                  height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Xác nhận và bật 2FA', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  Widget _buildDone() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 18),
            SizedBox(width: 6),
            Text('2FA đang BẬT cho tài khoản này.', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'Muốn tắt? Cần xác nhận cả mật khẩu hiện tại lẫn 1 mã OTP còn hiệu lực:',
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _disablePasswordController,
          enabled: !_loading,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Mật khẩu hiện tại', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _disableCodeController,
          enabled: !_loading,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          decoration: const InputDecoration(counterText: '', labelText: 'Mã OTP 6 số', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _loading ? null : _handleDisable,
          style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red), padding: const EdgeInsets.all(14)),
          child: _loading
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red))
              : const Text('Tắt 2FA'),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 13)),
    );
  }
}
