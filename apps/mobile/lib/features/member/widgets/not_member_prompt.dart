import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Hiện ở Referral/Points khi user chưa đăng ký làm Thành viên 369 — form
/// đăng ký thật nằm ở ProfileScreen (một nơi duy nhất), ở đây chỉ điều hướng
/// sang đó để tránh lặp lại logic đăng ký ở nhiều màn hình.
class NotMemberPrompt extends StatelessWidget {
  final String message;
  const NotMemberPrompt({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.push('/member/profile'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Đăng ký làm Thành viên', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
