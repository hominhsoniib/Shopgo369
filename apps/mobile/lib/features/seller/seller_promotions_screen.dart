import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';

/// Seller Center — Quản lý mã khuyến mãi của gian hàng.
/// GET/POST /seller/promotions, PATCH /seller/promotions/:id/deactivate
/// (PromotionsController — chỉ SELLER/MEMBER/ADMIN/SUPER_ADMIN có gian hàng).
class SellerPromotionsScreen extends StatefulWidget {
  const SellerPromotionsScreen({super.key});

  @override
  State<SellerPromotionsScreen> createState() => _SellerPromotionsScreenState();
}

class _SellerPromotionsScreenState extends State<SellerPromotionsScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _promotions = [];
  final Set<String> _deactivating = {};

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
      final response = await ApiClient().dio.get('/seller/promotions');
      if (!mounted) return;
      setState(() => _promotions = (response.data is List) ? response.data as List : []);
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data is Map) ? e.response?.data['message'] : null;
      setState(() => _error = message?.toString() ?? 'Không tải được danh sách mã khuyến mãi');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deactivate(String id) async {
    setState(() => _deactivating.add(id));
    try {
      await ApiClient().dio.patch('/seller/promotions/$id/deactivate');
      if (!mounted) return;
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không vô hiệu hoá được — vui lòng thử lại')),
      );
    } finally {
      if (mounted) setState(() => _deactivating.remove(id));
    }
  }

  Future<void> _openCreateDialog() async {
    final created = await showDialog<bool>(
      context: context,
      builder: (_) => _CreatePromotionDialog(),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mã khuyến mãi'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: _openCreateDialog, tooltip: 'Tạo mã mới'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : _promotions.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Chưa có mã khuyến mãi nào', style: TextStyle(color: Colors.grey)),
                          const SizedBox(height: 12),
                          ElevatedButton(onPressed: _openCreateDialog, child: const Text('Tạo mã đầu tiên')),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _promotions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final promo = _promotions[index] as Map<String, dynamic>;
                          return _PromotionCard(
                            promo: promo,
                            deactivating: _deactivating.contains(promo['id']),
                            onDeactivate: () => _deactivate(promo['id']),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _PromotionCard extends StatelessWidget {
  final Map<String, dynamic> promo;
  final bool deactivating;
  final VoidCallback onDeactivate;

  const _PromotionCard({required this.promo, required this.deactivating, required this.onDeactivate});

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');
    final isActive = promo['isActive'] == true;
    final type = promo['type'] as String;
    final value = num.tryParse(promo['value'].toString()) ?? 0;
    final valueLabel = type == 'PERCENTAGE' ? '${value.toStringAsFixed(0)}%' : currency.format(value);
    final usedCount = promo['usedCount'] ?? 0;
    final usageLimit = promo['usageLimit'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(promo['code'] ?? '—', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (isActive ? Colors.green : Colors.grey).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isActive ? 'Đang hoạt động' : 'Đã tắt',
                    style: TextStyle(color: isActive ? Colors.green : Colors.grey, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text('Giảm $valueLabel${type == 'PERCENTAGE' && promo['maxDiscountAmount'] != null ? ' (tối đa ${currency.format(num.tryParse(promo['maxDiscountAmount'].toString()) ?? 0)})' : ''}'),
            const SizedBox(height: 2),
            Text('Đã dùng: $usedCount${usageLimit != null ? '/$usageLimit' : ''}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            if (isActive) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: deactivating ? null : onDeactivate,
                  child: deactivating
                      ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Vô hiệu hoá', style: TextStyle(color: Colors.red)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CreatePromotionDialog extends StatefulWidget {
  @override
  State<_CreatePromotionDialog> createState() => _CreatePromotionDialogState();
}

class _CreatePromotionDialogState extends State<_CreatePromotionDialog> {
  final _codeController = TextEditingController();
  final _valueController = TextEditingController();
  String _type = 'PERCENTAGE';
  DateTime? _startsAt;
  DateTime? _endsAt;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    _valueController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() => isStart ? _startsAt = picked : _endsAt = picked);
  }

  Future<void> _submit() async {
    final code = _codeController.text.trim();
    final value = double.tryParse(_valueController.text.trim());
    if (code.isEmpty || value == null || _startsAt == null || _endsAt == null) {
      setState(() => _error = 'Vui lòng nhập đủ mã, giá trị giảm, ngày bắt đầu và kết thúc');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ApiClient().dio.post('/seller/promotions', data: {
        'code': code,
        'type': _type,
        'value': value,
        'startsAt': _startsAt!.toIso8601String(),
        'endsAt': _endsAt!.toIso8601String(),
      });
      if (mounted) Navigator.pop(context, true);
    } on DioException catch (e) {
      if (!mounted) return;
      final message = (e.response?.data is Map) ? e.response?.data['message'] : null;
      setState(() => _error = message?.toString() ?? 'Tạo mã thất bại — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy');
    return AlertDialog(
      title: const Text('Tạo mã khuyến mãi'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _codeController,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'Mã (VD: GIAM10)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Loại giảm giá', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'PERCENTAGE', child: Text('Theo phần trăm (%)')),
                DropdownMenuItem(value: 'FIXED_AMOUNT', child: Text('Số tiền cố định (đ)')),
              ],
              onChanged: (v) => setState(() => _type = v ?? 'PERCENTAGE'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _valueController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: _type == 'PERCENTAGE' ? 'Giá trị (0-100)' : 'Số tiền giảm (đ)',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pickDate(isStart: true),
                    child: Text(_startsAt == null ? 'Ngày bắt đầu' : dateFormat.format(_startsAt!)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _pickDate(isStart: false),
                    child: Text(_endsAt == null ? 'Ngày kết thúc' : dateFormat.format(_endsAt!)),
                  ),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Huỷ')),
        ElevatedButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Tạo mã'),
        ),
      ],
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
