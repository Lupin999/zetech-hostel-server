import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/student/dashboard_screen.dart';
import '../screens/student/rooms_screen.dart';
import '../screens/student/my_bookings_screen.dart';
import '../screens/student/notices_screen.dart';
import '../screens/student/menu_screen.dart';
import '../screens/admin/admin_dashboard_screen.dart';
import '../screens/student/profile_screen.dart';
import '../screens/auth/create_admin_screen.dart';

class AppRoutes {
  static final router = GoRouter(
    initialLocation: '/',
    redirect: (BuildContext context, GoRouterState state) {
      final auth = context.read<AuthProvider>();
      final isLoggedIn = auth.token != null;
      final isLoading = auth.loading;
      final location = state.matchedLocation;

      if (isLoading) return null;

      final authRoutes = ['/login', '/register'];

      if (!isLoggedIn && !authRoutes.contains(location) && location != '/' && location != '/create-admin') {
        return '/login';
      }
      if (isLoggedIn && authRoutes.contains(location)) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
      GoRoute(path: '/rooms', builder: (context, state) => const RoomsScreen()),
      GoRoute(path: '/my-bookings', builder: (context, state) => const MyBookingsScreen()),
      GoRoute(path: '/menu', builder: (context, state) => const MenuScreen()),
      GoRoute(path: '/notices', builder: (context, state) => const NoticesScreen()),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardScreen(),
        redirect: (context, state) {
          final auth = context.read<AuthProvider>();
          final role = auth.user?.role?.toLowerCase() ?? '';
          if (!['admin', 'accounts', 'warden'].contains(role)) return '/dashboard';
          return null;
        },
      ),
      GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      GoRoute(path: '/create-admin', builder: (context, state) => const CreateAdminScreen()),
    ],
  );
}
