import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

/// Checkout — cùng logic với Web (apps/web/app/(shop)/checkout/page.tsx):
/// tạo Order qua POST /orders, nếu ONLINE thì gọi tiếp POST /payments/:id/init.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _receiverController = TextEditingController();
  final _phoneController = TextEditingController();
  final _provinceController = TextEditingController();
  final _districtController = TextEditingController();
  final _wardController = TextEditingController();
  final _addressLineController = TextEditingController();

  List<dynamic> _shippingMethods = [];
  String? _selectedShippingMethodId;
  String _paymentMethod = 'ONLINE';
  bool _submitting = false;
  String? _error;

  bool _loadingShipping = true;
  String? _shippingError;

  @override
  void initState() {
    super.initState();
    _loadShippingMethods();
  }

  Future<void> _loadShippingMethods() async {
    setState(() {
      _loadingShipping = true;
      _shippingError = null;
    });
    try {
      final response = await ApiClient().dio.get('/shipping/methods');
      if (!mounted) return;
      final data = response.data;
      final methods = data is List ? data : <dynamic>[];
      setState(() {
        _shippingMethods = methods;
        _selectedShippingMethodId = methods.isNotEmpty ? methods.first['id'] : null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _shippingMethods = [];
        _selectedShippingMethodId = null;
        _shippingError = 'Không tải được phương thức vận chuyển — vui lòng thử lại';
      });
    } finally {
      if (mounted) setState(() => _loadingShipping = false);
    }
  }

  Future<void> _submit() async {
    if (_selectedShippingMethodId == null) {
      setState(() => _error = 'Vui lòng chọn phương thức vận chuyển trước khi đặt hàng');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final response = await ApiClient().dio.post('/orders', data: {
        'address': {
          'receiver': _receiverController.text,
          'phone': _phoneController.text,
          'province': _provinceController.text,
          'district': _districtController.text,
          'ward': _wardController.text,
          'addressLine': _addressLineController.text,
        },
        'shippingMethodId': _selectedShippingMethodId,
        'paymentMethod': _paymentMethod,
      });

      final orders = response.data as List;
      final firstOrder = orders.first;

      if (firstOrder['paymentMethod'] == 'ONLINE') {
        await ApiClient().dio.post('/payments/${firstOrder['id']}/init');
        // Phase 6: mở WebView thanh toán thật sẽ bổ sung khi tích hợp VNPay/Momo SDK.
      }

      if (mounted) context.go('/orders/${firstOrder['id']}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Đặt hàng thất bại — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thanh toán')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Địa chỉ giao hàng', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(controller: _receiverController, decoration: const InputDecoration(labelText: 'Người nhận')),
            TextField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Số điện thoại')),
            TextField(controller: _provinceController, decoration: const InputDecoration(labelText: 'Tỉnh/Thành phố')),
            TextField(controller: _districtController, decoration: const InputDecoration(labelText: 'Quận/Huyện')),
            TextField(controller: _wardController, decoration: const InputDecoration(labelText: 'Phường/Xã')),
            TextField(controller: _addressLineController, decoration: const InputDecoration(labelText: 'Địa chỉ cụ thể')),
            const SizedBox(height: 16),
            const Text('Vận chuyển', style: TextStyle(fontWeight: FontWeight.bold)),
            if (_loadingShipping)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_shippingError != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_shippingError!, style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: _loadShippingMethods,
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              )
            else if (_shippingMethods.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('Hiện chưa có phương thức vận chuyển khả dụng'),
              )
            else
              RadioGroup<String>(
                groupValue: _selectedShippingMethodId,
                onChanged: (v) => setState(() => _selectedShippingMethodId = v),
                child: Column(
                  children: _shippingMethods
                      .map((m) => RadioListTile<String>(
                            value: m['id'],
                            title: Text('${m['name']} — ${m['baseFee']}đ'),
                          ))
                      .toList(),
                ),
              ),
            const SizedBox(height: 16),
            const Text('Thanh toán', style: TextStyle(fontWeight: FontWeight.bold)),
            RadioGroup<String>(
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              child: const Column(
                children: [
                  RadioListTile<String>(value: 'ONLINE', title: Text('Thanh toán online')),
                  RadioListTile<String>(value: 'COD', title: Text('Thanh toán khi nhận hàng (COD)')),
                ],
              ),
            ),
            if (_error != null) Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.all(14)),
                child: Text(_submitting ? 'Đang xử lý...' : 'Đặt hàng', style: const TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
