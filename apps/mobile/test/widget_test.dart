import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:platform_369_mobile/main.dart';

void main() {
  testWidgets('App khởi tạo không lỗi (smoke test)', (WidgetTester tester) async {
    await tester.pumpWidget(const Platform369App());

    // Chỉ pump đúng 1 frame — KHÔNG dùng pumpAndSettle, vì màn hình đầu tiên
    // (ShopHomeScreen) gọi API thật trong initState(). Khi chạy `flutter test`
    // không có backend thật ở localhost, nên test này chỉ xác nhận widget tree
    // dựng lên không lỗi đồng bộ, không chờ kết quả network.
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
