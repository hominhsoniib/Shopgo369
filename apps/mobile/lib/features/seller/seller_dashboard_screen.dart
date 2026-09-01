import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';

/// Rút gọn từ Seller Dashboard Web (Phase 3) — hiển thị số liệu cốt lõi cho
/// seller xem nhanh trên điện thoại, cùng endpoint GET /seller/dashboard/overview.
class SellerDashboardScreen extends StatefulWidget {
  const SellerDashboardScreen({super.key});

  @override
  State<SellerDashboardScreen> createState() => _SellerDashboardScreenState();
}

class _SellerDashboardScreenState extends State<SellerDashboardScreen> {
  Map<String, dynamic>? _overview;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await ApiClient().dio.get('/seller/dashboard/overview');
      setState(() => _overview = response.data);
    } catch (e) {
      setState(() => _error = 'Cần đăng nhập với vai trò seller');
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    if (_error != null) return Scaffold(body: Center(child: Text(_error!)));
    if (_overview == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final overview = _overview!;
    return Scaffold(
      appBar: AppBar(title: const Text('Seller Center')),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.4,
        children: [
          _StatCard(label: 'Doanh thu', value: currency.format(overview['revenue']), highlight: true),
          _StatCard(label: 'Tổng đơn', value: '${overview['totalOrders']}'),
          _StatCard(label: 'Đơn cần xử lý', value: '${overview['pendingOrders']}', warn: true),
          _StatCard(label: 'Đơn tính doanh thu', value: '${overview['revenueOrderCount']}'),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;
  final bool warn;

  const _StatCard({required this.label, required this.value, this.highlight = false, this.warn = false});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: highlight ? Colors.red : (warn ? Colors.orange : Colors.black),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
