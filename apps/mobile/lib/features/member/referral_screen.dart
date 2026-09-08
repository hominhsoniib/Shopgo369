import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import 'widgets/not_member_prompt.dart';

/// Member Center — Người tôi đã giới thiệu (tầng 1 duy nhất, Mục 4.3 spec).
/// Dùng chung GET /members/me với ProfileScreen (field `referrals` mới được
/// backend bổ sung vào include — xem members.service.ts).
class ReferralScreen extends StatefulWidget {
  const ReferralScreen({super.key});

  @override
  State<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends State<ReferralScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _member;

  @override
  void initState() {
    super.initState();
    _load();
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
      setState(() => _error = 'Không tải được dữ liệu — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _copyMemberCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Đã sao chép mã "$code"')),
    );
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Người tôi đã giới thiệu')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : _member == null
                  ? const NotMemberPrompt(
                      message: 'Bạn cần đăng ký làm Thành viên 369 trước khi có mã giới thiệu.',
                    )
                  : RefreshIndicator(onRefresh: _load, child: _buildContent(_member!)),
    );
  }

  Widget _buildContent(Map<String, dynamic> member) {
    final memberCode = member['memberCode'] as String? ?? '';
    final referrals = (member['referrals'] as List?) ?? [];
    final dateFormat = DateFormat('dd/MM/yyyy');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: Colors.red[50],
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Mã giới thiệu của bạn', style: TextStyle(color: Colors.grey, fontSize: 13)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(memberCode, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.red)),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 18, color: Colors.red),
                      onPressed: () => _copyMemberCode(memberCode),
                      tooltip: 'Sao chép mã',
                    ),
                  ],
                ),
                const Text(
                  'Chia sẻ mã này để mời người khác trở thành thành viên — bạn sẽ nhận hoa hồng khi họ phát sinh đơn hàng.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text('Đã giới thiệu (${referrals.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 8),
        if (referrals.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Text('Chưa có ai được bạn giới thiệu', style: TextStyle(color: Colors.grey)),
            ),
          )
        else
          ...referrals.map((r) {
            final rUser = r['user'] as Map<String, dynamic>?;
            final createdAt = DateTime.tryParse(r['createdAt'] ?? '');
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                title: Text(rUser?['fullName'] ?? r['memberCode'] ?? '—'),
                subtitle: Text(
                  '${r['memberCode']}${createdAt != null ? ' · Tham gia ${dateFormat.format(createdAt)}' : ''}',
                ),
                trailing: Text(_statusLabel(r['status'] as String? ?? 'PENDING'),
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ),
            );
          }),
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
