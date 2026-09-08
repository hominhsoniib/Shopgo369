import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import 'widgets/not_member_prompt.dart';

/// Member Center — Điểm & lịch sử tích điểm. Nguồn: GET /member/points
/// (PointsService.getMyPoints — trả { totalPoints, level, history }).
class PointsScreen extends StatefulWidget {
  const PointsScreen({super.key});

  @override
  State<PointsScreen> createState() => _PointsScreenState();
}

class _PointsScreenState extends State<PointsScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data; // null = chưa là thành viên

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
      final response = await ApiClient().dio.get('/member/points');
      if (!mounted) return;
      setState(() => _data = response.data as Map<String, dynamic>?);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được điểm — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Điểm & hạng thành viên')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : _data == null
                  ? const NotMemberPrompt(
                      message: 'Bạn cần đăng ký làm Thành viên 369 trước khi có thể tích điểm.',
                    )
                  : RefreshIndicator(onRefresh: _load, child: _buildContent(_data!)),
    );
  }

  Widget _buildContent(Map<String, dynamic> data) {
    final totalPoints = data['totalPoints'] ?? 0;
    final level = data['level'] as Map<String, dynamic>?;
    final history = (data['history'] as List?) ?? [];
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: Colors.amber[50],
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text('$totalPoints', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.orange)),
                const Text('điểm tích lũy', style: TextStyle(color: Colors.grey)),
                if (level != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Hạng ${level['name']}', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.w600)),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Text('Lịch sử điểm', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 8),
        if (history.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: Text('Chưa có giao dịch điểm nào', style: TextStyle(color: Colors.grey))),
          )
        else
          ...history.map((h) {
            final points = h['points'] as int? ?? 0;
            final isPositive = points >= 0;
            final createdAt = DateTime.tryParse(h['createdAt'] ?? '');
            return ListTile(
              leading: Icon(
                isPositive ? Icons.add_circle_outline : Icons.remove_circle_outline,
                color: isPositive ? Colors.green : Colors.red,
              ),
              title: Text(h['reason'] ?? '—'),
              subtitle: createdAt != null ? Text(dateFormat.format(createdAt)) : null,
              trailing: Text(
                '${isPositive ? '+' : ''}$points',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isPositive ? Colors.green : Colors.red,
                ),
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
