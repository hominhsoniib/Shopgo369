import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../models/product.dart';

/// Trang chủ 369 SHOP — gọi CÙNG endpoint GET /products với Web
/// (apps/web/app/(shop)/page.tsx), tái sử dụng 100% logic backend (Mục 12 spec).
class ShopHomeScreen extends StatefulWidget {
  const ShopHomeScreen({super.key});

  @override
  State<ShopHomeScreen> createState() => _ShopHomeScreenState();
}

class _ShopHomeScreenState extends State<ShopHomeScreen> {
  List<Product> _products = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => _loading = true);
    try {
      final response = await ApiClient().dio.get('/products');
      final items = (response.data['items'] as List).map((e) => Product.fromJson(e)).toList();
      setState(() {
        _products = items;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Không tải được sản phẩm — kiểm tra kết nối mạng');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return Scaffold(
      appBar: AppBar(
        title: const Text('369 SHOP', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.shopping_cart), onPressed: () => context.push('/cart')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadProducts,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.7,
                    ),
                    itemCount: _products.length,
                    itemBuilder: (context, index) {
                      final product = _products[index];
                      return GestureDetector(
                        onTap: () => context.push('/products/${product.slug}'),
                        child: Card(
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Container(
                                  color: Colors.grey[200],
                                  width: double.infinity,
                                  child: product.imageUrls.isNotEmpty
                                      ? Image.network(product.imageUrls.first, fit: BoxFit.cover)
                                      : const Icon(Icons.image, size: 48, color: Colors.grey),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 4),
                                    Text(currency.format(product.basePrice),
                                        style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
