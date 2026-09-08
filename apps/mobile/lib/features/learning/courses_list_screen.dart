import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

/// Learning — danh sách khoá học đã publish. Public, không cần đăng nhập
/// để xem danh sách (GET /learning/courses không có JwtAuthGuard).
class CoursesListScreen extends StatefulWidget {
  const CoursesListScreen({super.key});

  @override
  State<CoursesListScreen> createState() => _CoursesListScreenState();
}

class _CoursesListScreenState extends State<CoursesListScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _courses = [];

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
      final response = await ApiClient().dio.get('/learning/courses');
      if (!mounted) return;
      setState(() => _courses = (response.data is List) ? response.data as List : []);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được danh sách khoá học — vui lòng thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Khoá học 369')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : _courses.isEmpty
                  ? const Center(child: Text('Chưa có khoá học nào', style: TextStyle(color: Colors.grey)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _courses.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final course = _courses[index] as Map<String, dynamic>;
                          final lessons = (course['lessons'] as List?) ?? [];
                          final coverUrl = course['coverUrl'] as String?;
                          return Card(
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: () => context.push('/learning/courses/${course['id']}'),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (coverUrl != null && coverUrl.isNotEmpty)
                                    Image.network(
                                      coverUrl,
                                      height: 140,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        height: 140,
                                        color: Colors.grey[200],
                                        child: const Icon(Icons.school_outlined, size: 40, color: Colors.grey),
                                      ),
                                    ),
                                  Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(course['title'] ?? '—',
                                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                        if ((course['description'] as String?)?.isNotEmpty == true) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            course['description'],
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                                          ),
                                        ],
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            const Icon(Icons.menu_book_outlined, size: 14, color: Colors.grey),
                                            const SizedBox(width: 4),
                                            Text('${lessons.length} bài học', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                          ],
                                        ),
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
