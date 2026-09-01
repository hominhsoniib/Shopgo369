import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';

/// Giỏ hàng — cùng logic nghiệp vụ với Web (apps/web/app/(shop)/cart/page.tsx),
/// gọi chung GET /cart, PATCH/DELETE /cart/items/:productId.
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  List<dynamic> _items = [];
  double _subtotal = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final response = await ApiClient().dio.get('/cart');
      setState(() {
        _items = response.data['items'];
        _subtotal = (response.data['subtotal'] as num).toDouble();
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Không tải được giỏ hàng — cần đăng nhập');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateQuantity(String productId, int quantity) async {
    await ApiClient().dio.patch('/cart/items/$productId', data: {'quantity': quantity});
    _load();
  }

  Future<void> _removeItem(String productId) async {
    await ApiClient().dio.delete('/cart/items/$productId');
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return Scaffold(
      appBar: AppBar(title: const Text('Giỏ hàng')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : _items.isEmpty
                  ? const Center(child: Text('Giỏ hàng đang trống'))
                  : ListView.separated(
                      itemCount: _items.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final item = _items[index];
                        final product = item['product'];
                        return ListTile(
                          leading: Container(width: 48, height: 48, color: Colors.grey[200]),
                          title: Text(product['name'], maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: Text(
                            currency.format(double.tryParse(product['basePrice'].toString()) ?? 0),
                            style: const TextStyle(color: Colors.red),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove, size: 18),
                                onPressed: () => _updateQuantity(item['productId'], item['quantity'] - 1),
                              ),
                              Text('${item['quantity']}'),
                              IconButton(
                                icon: const Icon(Icons.add, size: 18),
                                onPressed: () => _updateQuantity(item['productId'], item['quantity'] + 1),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 18, color: Colors.grey),
                                onPressed: () => _removeItem(item['productId']),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
      bottomNavigationBar: (_items.isNotEmpty)
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text('Tạm tính: ${currency.format(_subtotal)}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    ElevatedButton(
                      onPressed: () => context.push('/checkout'),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                      child: const Text('Thanh toán', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
