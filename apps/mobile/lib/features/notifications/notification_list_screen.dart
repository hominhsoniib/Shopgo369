import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../models/notification_item.dart';

/// Danh sách thông báo trong app — nguồn dữ liệu là `notification_logs` phía
/// backend (P4), nên LUÔN đầy đủ lịch sử kể cả những lần push thực tế gửi
/// thất bại/bị skip (vd: user tắt trong Preferences, hoặc chưa cấu hình FCM).
class NotificationListScreen extends StatefulWidget {
  const NotificationListScreen({super.key});

  @override
  State<NotificationListScreen> createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  List<NotificationItem> _items = [];
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
      final response = await ApiClient().dio.get('/notifications');
      final items = (response.data['items'] as List)
          .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() => _items = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được thông báo — kiểm tra kết nối mạng');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAsRead(NotificationItem item) async {
    if (item.isRead) return;
    setState(() {
      final idx = _items.indexWhere((n) => n.id == item.id);
      if (idx != -1) {
        _items[idx] = NotificationItem(
          id: item.id,
          templateCode: item.templateCode,
          title: item.title,
          body: item.body,
          isRead: true,
          createdAt: item.createdAt,
        );
      }
    });
    try {
      await ApiClient().dio.patch('/notifications/${item.id}/read');
    } catch (_) {
      // Không hoàn tác UI — lần load lại sau sẽ tự đồng bộ đúng trạng thái
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await ApiClient().dio.post('/notifications/read-all');
      await _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không đánh dấu được tất cả — thử lại sau')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('HH:mm dd/MM');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Đánh dấu đã đọc tất cả',
            onPressed: _items.any((n) => !n.isRead) ? _markAllAsRead : null,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    children: [
                      const SizedBox(height: 80),
                      Center(child: Text(_error!)),
                      const SizedBox(height: 12),
                      Center(child: OutlinedButton(onPressed: _load, child: const Text('Thử lại'))),
                    ],
                  )
                : _items.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 120),
                          Center(
                            child: Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                          ),
                          SizedBox(height: 12),
                          Center(child: Text('Chưa có thông báo nào', style: TextStyle(color: Colors.grey))),
                        ],
                      )
                    : ListView.separated(
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final item = _items[index];
                          return ListTile(
                            onTap: () => _markAsRead(item),
                            tileColor: item.isRead ? null : Colors.red.withOpacity(0.04),
                            leading: CircleAvatar(
                              backgroundColor: item.isRead ? Colors.grey[300] : Colors.red,
                              child: Icon(Icons.notifications, color: item.isRead ? Colors.grey[600] : Colors.white, size: 18),
                            ),
                            title: Text(
                              item.title,
                              style: TextStyle(fontWeight: item.isRead ? FontWeight.normal : FontWeight.bold),
                            ),
                            subtitle: Text(item.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                            trailing: Text(
                              dateFormat.format(item.createdAt.toLocal()),
                              style: const TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
