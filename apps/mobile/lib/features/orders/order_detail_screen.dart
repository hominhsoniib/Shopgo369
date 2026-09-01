import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  String? _error;

  static const Map<String, String> statusLabel = {
    'PENDING_PAYMENT': 'Chờ thanh toán',
    'PENDING_CONFIRM': 'Chờ người bán xác nhận',
    'PAID': 'Đã thanh toán',
    'CONFIRMED': 'Đã xác nhận',
    'PACKED': 'Đã đóng gói',
    'SHIPPING': 'Đang giao hàng',
    'DELIVERED': 'Đã giao',
    'COMPLETED': 'Hoàn tất',
    'CANCELLED': 'Đã huỷ',
    'PAYMENT_FAILED': 'Thanh toán thất bại',
    'REFUNDED': 'Đã hoàn tiền',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await ApiClient().dio.get('/orders/${widget.orderId}');
      setState(() => _order = response.data);
    } catch (e) {
      setState(() => _error = 'Không tải được đơn hàng');
    }
  }

  Future<void> _confirmReceived() async {
    await ApiClient().dio.patch('/orders/${widget.orderId}/confirm-received');
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    if (_error != null) return Scaffold(body: Center(child: Text(_error!)));
    if (_order == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final order = _order!;
    final status = order['status'] as String;

    return Scaffold(
      appBar: AppBar(title: Text('Đơn hàng ${order['orderCode']}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Trạng thái: ${statusLabel[status] ?? status}',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
          const SizedBox(height: 16),
          const Text('Sản phẩm', style: TextStyle(fontWeight: FontWeight.bold)),
          ...(order['items'] as List).map((item) => ListTile(
                dense: true,
                title: Text('${item['productName']} x${item['quantity']}'),
                trailing: Text(currency.format(double.parse(item['unitPrice'].toString()) * item['quantity'])),
              )),
          const Divider(),
          Text('Tổng: ${currency.format(double.parse(order['totalAmount'].toString()))}',
              textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          if (status == 'DELIVERED' || status == 'SHIPPING')
            ElevatedButton(
              onPressed: _confirmReceived,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Đã nhận được hàng', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
    );
  }
}
