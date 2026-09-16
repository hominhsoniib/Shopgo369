import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../models/order.dart';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> {
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String? _error;

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
      final response = await ApiClient().dio.get('/orders');
      if (!mounted) return;
      setState(() => _orders = (response.data as List).map((e) => OrderSummary.fromJson(e)).toList());
    } catch (e) {
      // Trước đây hàm này không có try/catch — nếu GET /orders lỗi (mất
      // mạng, hết phiên...) thì _loading không bao giờ được set lại false,
      // màn hình treo vòng xoay loading vô hạn, không có cách nào thử lại.
      if (!mounted) return;
      setState(() => _error = 'Không tải được danh sách đơn hàng — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    return Scaffold(
      appBar: AppBar(title: const Text('Đơn hàng của tôi')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : _orders.isEmpty
                  ? const Center(child: Text('Chưa có đơn hàng nào', style: TextStyle(color: Colors.grey)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        itemCount: _orders.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final order = _orders[index];
                          return ListTile(
                            title: Text(order.orderCode),
                            subtitle: Text(order.status),
                            trailing: Text(currency.format(order.totalAmount)),
                            onTap: () => context.push('/orders/${order.id}'),
                          );
                        },
                      ),
                    ),
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
