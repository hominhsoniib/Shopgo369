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

  @override
  void initState() {
    super.initState();
    _loadShippingMethods();
  }

  Future<void> _loadShippingMethods() async {
    final response = await ApiClient().dio.get('/shipping/methods');
    setState(() {
      _shippingMethods = response.data;
      if (_shippingMethods.isNotEmpty) _selectedShippingMethodId = _shippingMethods.first['id'];
    });
  }

  Future<void> _submit() async {
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
      setState(() => _error = 'Đặt hàng thất bại — vui lòng thử lại');
    } finally {
      setState(() => _submitting = false);
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
            ..._shippingMethods.map((m) => RadioListTile<String>(
                  value: m['id'],
                  groupValue: _selectedShippingMethodId,
                  onChanged: (v) => setState(() => _selectedShippingMethodId = v),
                  title: Text('${m['name']} — ${m['baseFee']}đ'),
                )),
            const SizedBox(height: 16),
            const Text('Thanh toán', style: TextStyle(fontWeight: FontWeight.bold)),
            RadioListTile<String>(
              value: 'ONLINE',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: const Text('Thanh toán online'),
            ),
            RadioListTile<String>(
              value: 'COD',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: const Text('Thanh toán khi nhận hàng (COD)'),
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
