import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import 'widgets/not_member_prompt.dart';

/// Member Center — Hoa hồng giới thiệu. Nguồn: GET /member/commission
/// (CommissionService.getMyCommissions — trả { transactions, payouts }).
class CommissionScreen extends StatefulWidget {
  const CommissionScreen({super.key});

  @override
  State<CommissionScreen> createState() => _CommissionScreenState();
}

class _CommissionScreenState extends State<CommissionScreen> {
  bool _loading = true;
  String? _error;
  bool _isMember = true;
  List<dynamic> _transactions = [];
  List<dynamic> _payouts = [];

  static const Map<String, String> _txStatusLabel = {
    'PENDING': 'Đang giữ (chờ hết hạn bảo vệ)',
    'APPROVED': 'Đã duyệt — chờ chi trả',
    'PAID': 'Đã chi trả',
    'REJECTED': 'Bị huỷ (đơn hoàn/huỷ)',
  };

  static const Map<String, Color> _txStatusColor = {
    'PENDING': Colors.orange,
    'APPROVED': Colors.blue,
    'PAID': Colors.green,
    'REJECTED': Colors.grey,
  };

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
      final response = await ApiClient().dio.get('/member/commission');
      if (!mounted) return;
      final data = response.data as Map<String, dynamic>;
      setState(() {
        _isMember = data['isMember'] == true;
        _transactions = (data['transactions'] as List?) ?? [];
        _payouts = (data['payouts'] as List?) ?? [];
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được dữ liệu hoa hồng — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hoa hồng giới thiệu')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : !_isMember
                  ? const NotMemberPrompt(
                      message: 'Bạn cần đăng ký làm Thành viên 369 để bắt đầu nhận hoa hồng giới thiệu.',
                    )
                  : RefreshIndicator(onRefresh: _load, child: _buildContent()),
    );
  }

  Widget _buildContent() {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    final dateFormat = DateFormat('dd/MM/yyyy');

    final totalPending = _transactions
        .where((t) => t['status'] == 'PENDING' || t['status'] == 'APPROVED')
        .fold<double>(0, (sum, t) => sum + (double.tryParse(t['amount'].toString()) ?? 0));
    final totalPaid = _transactions
        .where((t) => t['status'] == 'PAID')
        .fold<double>(0, (sum, t) => sum + (double.tryParse(t['amount'].toString()) ?? 0));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Card(
                color: Colors.orange[50],
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Đang chờ / đã duyệt', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text(currency.format(totalPending),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Card(
                color: Colors.green[50],
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Đã nhận', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text(currency.format(totalPaid),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        if (_payouts.isNotEmpty) ...[
          const Text('Các kỳ chi trả', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          ..._payouts.map((p) {
            final isPaid = p['status'] == 'PAID';
            return Card(
              child: ListTile(
                leading: Icon(isPaid ? Icons.check_circle : Icons.schedule, color: isPaid ? Colors.green : Colors.orange),
                title: Text(p['periodLabel'] ?? '—'),
                subtitle: Text(isPaid ? 'Đã chi trả' : 'Chờ chi trả'),
                trailing: Text(currency.format(double.tryParse(p['totalAmount'].toString()) ?? 0),
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            );
          }),
          const SizedBox(height: 20),
        ],
        Text('Lịch sử hoa hồng (${_transactions.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 8),
        if (_transactions.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: Text('Chưa có giao dịch hoa hồng nào', style: TextStyle(color: Colors.grey))),
          )
        else
          ..._transactions.map((t) {
            final status = t['status'] as String? ?? 'PENDING';
            final createdAt = DateTime.tryParse(t['createdAt'] ?? '');
            return ListTile(
              leading: Icon(Icons.attach_money, color: _txStatusColor[status] ?? Colors.grey),
              title: Text(currency.format(double.tryParse(t['amount'].toString()) ?? 0),
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(
                '${_txStatusLabel[status] ?? status}${createdAt != null ? ' · ${dateFormat.format(createdAt)}' : ''}',
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
