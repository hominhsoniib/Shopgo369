import 'package:dio/dio.dart';
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
  bool _confirming = false;

  // Refund — theo đúng phạm vi API thật: 1 đơn tối đa 1 refund (xem
  // refund.service.ts), xem trạng thái qua GET /refunds/order/:orderId.
  Map<String, dynamic>? _refund;
  bool _loadingRefund = true;
  bool _submittingRefund = false;

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

  static const Map<String, String> refundStatusLabel = {
    'PENDING': 'Đang chờ xử lý',
    'SUCCESS': 'Đã hoàn tiền',
    'FAILED': 'Đã bị từ chối',
  };

  @override
  void initState() {
    super.initState();
    _load();
    _loadRefund();
  }

  Future<void> _load() async {
    try {
      final response = await ApiClient().dio.get('/orders/${widget.orderId}');
      if (!mounted) return;
      setState(() => _order = response.data);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được đơn hàng');
    }
  }

  Future<void> _loadRefund() async {
    setState(() => _loadingRefund = true);
    try {
      final response = await ApiClient().dio.get('/refunds/order/${widget.orderId}');
      if (!mounted) return;
      setState(() => _refund = response.data as Map<String, dynamic>?);
    } catch (e) {
      // Không chặn hiển thị đơn hàng nếu tải refund lỗi — chỉ ẩn mềm phần này.
      if (!mounted) return;
      setState(() => _refund = null);
    } finally {
      if (mounted) setState(() => _loadingRefund = false);
    }
  }

  Future<void> _confirmReceived() async {
    setState(() => _confirming = true);
    try {
      await ApiClient().dio.patch('/orders/${widget.orderId}/confirm-received');
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không xác nhận được — vui lòng thử lại')),
      );
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  Future<void> _openRequestRefundDialog() async {
    final reasonController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Yêu cầu hoàn tiền'),
        content: TextField(
          controller: reasonController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Lý do hoàn tiền *',
            border: OutlineInputBorder(),
            hintText: 'VD: Sản phẩm không đúng mô tả',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Huỷ')),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, reasonController.text.trim()),
            child: const Text('Gửi yêu cầu'),
          ),
        ],
      ),
    );
    reasonController.dispose();
    if (result == null || result.isEmpty || !mounted) return;
    await _submitRefund(result);
  }

  Future<void> _submitRefund(String reason) async {
    setState(() => _submittingRefund = true);
    try {
      // Không truyền `amount` — bỏ trống nghĩa là hoàn toàn phần (đúng theo
      // CreateRefundDto: amount?: number, "bỏ trống = hoàn toàn phần").
      await ApiClient().dio.post('/refunds', data: {
        'orderId': widget.orderId,
        'reason': reason,
      });
      if (!mounted) return;
      await _loadRefund();
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data is Map) ? e.response?.data['message'] : null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message?.toString() ?? 'Không gửi được yêu cầu hoàn tiền — vui lòng thử lại')),
      );
    } finally {
      if (mounted) setState(() => _submittingRefund = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    if (_error != null) return Scaffold(body: Center(child: Text(_error!)));
    if (_order == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final order = _order!;
    final status = order['status'] as String;
    final payment = order['payment'] as Map<String, dynamic>?;
    final paymentSucceeded = payment != null && payment['status'] == 'SUCCESS';

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
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _confirming ? null : _confirmReceived,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: _confirming
                    ? const SizedBox(
                        height: 18, width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Đã nhận được hàng', style: TextStyle(color: Colors.white)),
              ),
            ),

          if (paymentSucceeded) ...[
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            const Text('Hoàn tiền', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (_loadingRefund)
              const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
            else if (_refund == null)
              OutlinedButton(
                onPressed: _submittingRefund ? null : _openRequestRefundDialog,
                child: _submittingRefund
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Yêu cầu hoàn tiền'),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            refundStatusLabel[_refund!['status']] ?? _refund!['status'],
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(currency.format(double.parse(_refund!['amount'].toString()))),
                        ],
                      ),
                      if ((_refund!['reason'] as String?)?.isNotEmpty == true) ...[
                        const SizedBox(height: 4),
                        Text('Lý do: ${_refund!['reason']}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
