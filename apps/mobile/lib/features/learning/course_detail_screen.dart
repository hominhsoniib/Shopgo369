import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';

/// Learning — chi tiết khoá học + đánh dấu hoàn thành bài học.
/// GET /learning/courses/:id yêu cầu đăng nhập (trả kèm completedLessonIds).
/// PATCH /learning/lessons/:id/complete yêu cầu ĐÃ LÀ thành viên 369
/// (LearningService.completeLesson throw ForbiddenException nếu chưa) —
/// xem xử lý 403 riêng trong _completeLesson().
class CourseDetailScreen extends StatefulWidget {
  final String courseId;
  const CourseDetailScreen({super.key, required this.courseId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _course;
  Set<String> _completedLessonIds = {};
  String? _pendingLessonId; // bài đang gọi API complete, để disable đúng 1 nút

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
      final response = await ApiClient().dio.get('/learning/courses/${widget.courseId}');
      if (!mounted) return;
      final data = response.data as Map<String, dynamic>;
      setState(() {
        _course = data;
        _completedLessonIds = ((data['completedLessonIds'] as List?) ?? []).map((e) => e.toString()).toSet();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Không tải được khoá học — vui lòng đăng nhập và thử lại');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _completeLesson(String lessonId) async {
    setState(() => _pendingLessonId = lessonId);
    try {
      await ApiClient().dio.patch('/learning/lessons/$lessonId/complete');
      if (!mounted) return;
      setState(() => _completedLessonIds = {..._completedLessonIds, lessonId});
    } on DioException catch (e) {
      if (!mounted) return;
      final isForbidden = e.response?.statusCode == 403;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isForbidden
              ? 'Bạn cần đăng ký làm Thành viên 369 để đánh dấu hoàn thành bài học'
              : 'Không đánh dấu hoàn thành được — vui lòng thử lại'),
          action: isForbidden
              ? SnackBarAction(label: 'Đăng ký', onPressed: () => context.push('/member/profile'))
              : null,
        ),
      );
    } finally {
      if (mounted) setState(() => _pendingLessonId = null);
    }
  }

  Future<void> _openVideo(String videoUrl) async {
    final uri = Uri.tryParse(videoUrl);
    if (uri == null || !await canLaunchUrl(uri)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không mở được video')),
      );
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_course?['title'] as String? ?? 'Khoá học')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorState(message: _error!, onRetry: _load)
              : _buildContent(_course!),
    );
  }

  Widget _buildContent(Map<String, dynamic> course) {
    final lessons = (course['lessons'] as List?) ?? [];
    final description = course['description'] as String?;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (description != null && description.isNotEmpty) ...[
          Text(description, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
        ],
        Text('${_completedLessonIds.length}/${lessons.length} bài học đã hoàn thành',
            style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: lessons.isEmpty ? 0 : _completedLessonIds.length / lessons.length,
          backgroundColor: Colors.grey[200],
          color: Colors.green,
        ),
        const SizedBox(height: 16),
        ...lessons.map((l) {
          final lesson = l as Map<String, dynamic>;
          final lessonId = lesson['id'] as String;
          final isDone = _completedLessonIds.contains(lessonId);
          final videoUrl = lesson['videoUrl'] as String?;
          final content = lesson['content'] as String?;
          final isPending = _pendingLessonId == lessonId;

          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ExpansionTile(
              leading: Icon(
                isDone ? Icons.check_circle : Icons.radio_button_unchecked,
                color: isDone ? Colors.green : Colors.grey,
              ),
              title: Text(lesson['title'] ?? '—'),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (content != null && content.isNotEmpty) ...[
                        Text(content, style: const TextStyle(fontSize: 13)),
                        const SizedBox(height: 12),
                      ],
                      if (videoUrl != null && videoUrl.isNotEmpty) ...[
                        OutlinedButton.icon(
                          onPressed: () => _openVideo(videoUrl),
                          icon: const Icon(Icons.play_circle_outline),
                          label: const Text('Xem video bài học'),
                        ),
                        const SizedBox(height: 12),
                      ],
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: isDone || isPending ? null : () => _completeLesson(lessonId),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDone ? Colors.grey[300] : Colors.green,
                          ),
                          child: isPending
                              ? const SizedBox(
                                  height: 16, width: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text(
                                  isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành',
                                  style: TextStyle(color: isDone ? Colors.black54 : Colors.white),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
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
