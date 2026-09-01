import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../models/product.dart';

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  const ProductDetailScreen({super.key, required this.slug});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  Product? _product;
  String? _error;
  int _quantity = 1;
  bool _addingToCart = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await ApiClient().dio.get('/products/${widget.slug}');
      setState(() => _product = Product.fromJson(response.data));
    } catch (e) {
      setState(() => _error = 'Không tải được sản phẩm');
    }
  }

  Future<void> _addToCart() async {
    if (_product == null) return;
    setState(() => _addingToCart = true);
    try {
      await ApiClient().dio.post('/cart/items', data: {'productId': _product!.id, 'quantity': _quantity});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã thêm vào giỏ hàng')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thêm vào giỏ hàng thất bại — cần đăng nhập')));
      }
    } finally {
      setState(() => _addingToCart = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    if (_error != null) return Scaffold(body: Center(child: Text(_error!)));
    if (_product == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final product = _product!;
    return Scaffold(
      appBar: AppBar(title: Text(product.name, overflow: TextOverflow.ellipsis)),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Container(
                color: Colors.grey[200],
                child: product.imageUrls.isNotEmpty
                    ? Image.network(product.imageUrls.first, fit: BoxFit.cover)
                    : const Icon(Icons.image, size: 64, color: Colors.grey),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(currency.format(product.basePrice),
                      style: const TextStyle(fontSize: 22, color: Colors.red, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(
                    product.quantityAvailable > 0 ? 'Còn ${product.quantityAvailable} sản phẩm' : 'Hết hàng',
                    style: TextStyle(color: product.quantityAvailable > 0 ? Colors.green : Colors.red),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => setState(() => _quantity = (_quantity - 1).clamp(1, 999)),
                        icon: const Icon(Icons.remove_circle_outline),
                      ),
                      Text('$_quantity', style: const TextStyle(fontSize: 16)),
                      IconButton(
                        onPressed: () => setState(() => _quantity++),
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (product.quantityAvailable > 0 && !_addingToCart) ? _addToCart : null,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.all(14)),
              child: Text(_addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng',
                  style: const TextStyle(color: Colors.white)),
            ),
          ),
        ),
      ),
    );
  }
}
