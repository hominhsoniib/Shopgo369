import 'package:flutter/material.dart';

/// Theme dùng chung — màu chủ đạo đỏ (#DC2626) giống hệ nhận diện Web
/// (Mục 7.4 spec: responsive/design system nhất quán đa nền tảng).
final appTheme = ThemeData(
  useMaterial3: true,
  colorSchemeSeed: const Color(0xFFDC2626),
  scaffoldBackgroundColor: Colors.white,
  appBarTheme: const AppBarTheme(backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 0.5),
);
