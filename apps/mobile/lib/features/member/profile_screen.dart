import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/secure_storage.dart';
import '../../core/push/fcm_service.dart';

/// Member Center — Hồ sơ thành viên 369. Cùng dữ liệu với Web
/// (apps/web/app/(member)/member/profile — hiện là placeholder tĩnh, mobile
/// là nơi đầu tiên nối API thật GET /members/me / POST /members/register).
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _member; // null = user chưa đăng ký làm thành viên 369

  final _referralCodeController = TextEditingController();
  bool _registering = false;
  String? _registerError;

  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _changingPassword = false;
  String? _passwordMsg;
  bool _passwordSuccess = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _referralCodeController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await ApiClient().dio.get('/members/me');
      if (!mounted) return;
      setState(() => _member = response.data as Map<String, dynamic>?);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được hồ sơ — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _registerMember() async {
    setState(() {
      _registering = true;
      _registerError = null;
    });
    try {
      await ApiClient().dio.post('/members/register', data: {
        if (_referralCodeController.text.trim().isNotEmpty)
          'referralCode': _referralCodeController.text.trim(),
      });
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _registerError =
          'Đăng ký thất bại — kiểm tra lại mã giới thiệu hoặc thử lại sau');
    } finally {
      if (mounted) setState(() => _registering = false);
    }
  }

  Future<void> _changePassword() async {
    setState(() {
      _changingPassword = true;
      _passwordMsg = null;
    });
    try {
      await ApiClient().dio.post('/auth/change-password', data: {
        'currentPassword': _currentPasswordController.text,
        'newPassword': _newPasswordController.text,
      });
      if (!mounted) return;
      setState(() {
        _passwordSuccess = true;
        _passwordMsg = 'Đổi mật khẩu thành công';
      });
      _currentPasswordController.clear();
      _newPasswordController.clear();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _passwordSuccess = false;
        _passwordMsg = 'Đổi mật khẩu thất bại — kiểm tra lại mật khẩu hiện tại';
      });
    } finally {
      if (mounted) setState(() => _changingPassword = false);
    }
  }

  Future<void> _copyMemberCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Đã sao chép mã "$code"')),
    );
  }

  Future<void> _logout() async {
    // P4 — huỷ device token TRƯỚC khi xoá accessToken (API cần Bearer token
    // hợp lệ để biết xoá token của user nào).
    await FcmService.instance.unregisterCurrentDevice();
    await SecureStorageService().clear();
    if (mounted) context.go('/login');
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Bị từ chối';
      default:
        return 'Đang chờ duyệt';
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return Colors.green;
      case 'REJECTED':
        return Colors.grey;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ sơ thành viên'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout, tooltip: 'Đăng xuất'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _member == null ? _buildNotMemberYet() : _buildMemberProfile(_member!),
                ),
    );
  }

  Widget _buildNotMemberYet() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Icon(Icons.card_membership, size: 56, color: Colors.red),
        const SizedBox(height: 12),
        const Text(
          'Bạn chưa là Thành viên 369',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Đăng ký để nhận mã giới thiệu, tích điểm và theo dõi hoa hồng.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _referralCodeController,
          decoration: const InputDecoration(
            labelText: 'Mã giới thiệu (không bắt buộc)',
            border: OutlineInputBorder(),
            hintText: 'VD: 369-000001',
          ),
        ),
        if (_registerError != null) ...[
          const SizedBox(height: 8),
          Text(_registerError!, style: const TextStyle(color: Colors.red, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _registering ? null : _registerMember,
          style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.all(14)),
          child: _registering
              ? const SizedBox(
                  height: 18, width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Đăng ký làm Thành viên', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }

  Widget _buildMemberProfile(Map<String, dynamic> member) {
    final user = member['user'] as Map<String, dynamic>?;
    final level = member['level'] as Map<String, dynamic>?;
    final status = member['status'] as String? ?? 'PENDING';
    final memberCode = member['memberCode'] as String? ?? '';
    final points = member['points'] ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Thông tin tài khoản
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user?['fullName'] ?? '—', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(user?['email'] ?? '—', style: const TextStyle(color: Colors.grey)),
                if (user?['phone'] != null) Text(user!['phone'], style: const TextStyle(color: Colors.grey)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Mã thành viên + trạng thái
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Mã thành viên', style: TextStyle(color: Colors.grey, fontSize: 13)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _statusColor(status).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(_statusLabel(status),
                          style: TextStyle(color: _statusColor(status), fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(memberCode, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 18),
                      onPressed: () => _copyMemberCode(memberCode),
                      tooltip: 'Sao chép mã',
                    ),
                  ],
                ),
                if (level != null) ...[
                  const SizedBox(height: 4),
                  Text('Hạng: ${level['name']} · $points điểm', style: const TextStyle(color: Colors.grey)),
                ] else ...[
                  const SizedBox(height: 4),
                  Text('$points điểm', style: const TextStyle(color: Colors.grey)),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        ListTile(
          tileColor: Colors.grey[100],
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: const Icon(Icons.group_add_outlined),
          title: const Text('Người tôi đã giới thiệu'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/member/referral'),
        ),
        const SizedBox(height: 8),
        ListTile(
          tileColor: Colors.grey[100],
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: const Icon(Icons.star_border),
          title: const Text('Điểm & lịch sử tích điểm'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/member/points'),
        ),
        const SizedBox(height: 8),
        ListTile(
          tileColor: Colors.grey[100],
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: const Icon(Icons.attach_money),
          title: const Text('Hoa hồng giới thiệu'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/member/commission'),
        ),
        const SizedBox(height: 8),
        ListTile(
          tileColor: Colors.grey[100],
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: const Icon(Icons.shield_outlined),
          title: const Text('Bảo mật · Xác thực 2 lớp (2FA)'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push('/member/security'),
        ),

        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 12),
        const Text('Đổi mật khẩu', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextField(
          controller: _currentPasswordController,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Mật khẩu hiện tại', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _newPasswordController,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Mật khẩu mới (tối thiểu 8 ký tự)', border: OutlineInputBorder()),
        ),
        if (_passwordMsg != null) ...[
          const SizedBox(height: 8),
          Text(_passwordMsg!, style: TextStyle(color: _passwordSuccess ? Colors.green : Colors.red, fontSize: 13)),
        ],
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _changingPassword ? null : _changePassword,
          child: _changingPassword
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Cập nhật mật khẩu'),
        ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
