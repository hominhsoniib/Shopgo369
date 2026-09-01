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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final response = await ApiClient().dio.get('/orders');
    setState(() {
      _orders = (response.data as List).map((e) => OrderSummary.fromJson(e)).toList();
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    return Scaffold(
      appBar: AppBar(title: const Text('Đơn hàng của tôi')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
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
    );
  }
}
