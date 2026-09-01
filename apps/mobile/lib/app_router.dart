import 'package:go_router/go_router.dart';
import 'features/auth/login_screen.dart';
import 'features/shop/home_screen.dart';
import 'features/shop/product_detail_screen.dart';
import 'features/cart/cart_screen.dart';
import 'features/cart/checkout_screen.dart';
import 'features/orders/orders_list_screen.dart';
import 'features/orders/order_detail_screen.dart';
import 'features/seller/seller_dashboard_screen.dart';

/// Cấu trúc route được ánh xạ TƯƠNG ỨNG với URL Web (Mục 5.4 spec) để giữ
/// tư duy điều hướng nhất quán giữa Web ↔ Mobile: /p/{slug} ↔ /products/{slug},
/// /cart, /checkout, /account/orders/{id} ↔ /orders/{id}, /seller/dashboard.
final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/', builder: (context, state) => const ShopHomeScreen()),
    GoRoute(
      path: '/products/:slug',
      builder: (context, state) => ProductDetailScreen(slug: state.pathParameters['slug']!),
    ),
    GoRoute(path: '/cart', builder: (context, state) => const CartScreen()),
    GoRoute(path: '/checkout', builder: (context, state) => const CheckoutScreen()),
    GoRoute(path: '/orders', builder: (context, state) => const OrdersListScreen()),
    GoRoute(
      path: '/orders/:id',
      builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
    ),
    GoRoute(path: '/seller/dashboard', builder: (context, state) => const SellerDashboardScreen()),
  ],
);
