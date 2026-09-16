class ApiConfig {
  // ─── BASE URL ────────────────────────────────────────────────────────────
  // Priority order (first non-null wins at runtime):
  //   1. Pass --dart-define=API_BASE_URL=https://... to `flutter run` or your CI build.
  //   2. Falls back to the compile-time constant below.
  //
  // Common values:
  //   Android emulator  → http://10.0.2.2:5000/api
  //   iOS simulator     → http://localhost:5000/api
  //   Phone on same WiFi → http://<YOUR_PC_IP>:5000/api
  //   Production (Render/Railway) → https://your-app.onrender.com/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api', // Android emulator default
  );

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  static const String login = '$baseUrl/auth/login';
  static const String register = '$baseUrl/auth/register';
  static const String verify = '$baseUrl/auth/verify';
  static const String sendOtp = '$baseUrl/auth/send-otp';
  static const String verifyOtp = '$baseUrl/auth/verify-otp';
  // Correct route on server: PUT /auth/profile (change password)
  static const String changePassword = '$baseUrl/auth/profile';
  static const String profileInfo = '$baseUrl/auth/profile/info';
  static const String createAdmin = '$baseUrl/auth/create-admin';
  static const String forgotPassword = '$baseUrl/auth/forgot-password';
  static const String resetPassword = '$baseUrl/auth/reset-password';

  // ─── ROOMS ────────────────────────────────────────────────────────────────
  static const String rooms = '$baseUrl/rooms';
  // Usage: '${ApiConfig.roomBeds(id)}'
  static String roomBeds(dynamic id) => '$baseUrl/rooms/$id/beds';

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────
  static const String bookings = '$baseUrl/bookings';
  static const String activeBooking = '$baseUrl/bookings/active';
  static const String bookingStatus = '$baseUrl/bookings/status';
  static const String myBookings = '$baseUrl/bookings/my';
  static const String allBookings = '$baseUrl/bookings/all';
  static const String toggleBookings = '$baseUrl/bookings/toggle';

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  static const String payments = '$baseUrl/payments';
  static const String myPayments = '$baseUrl/payments/my';
  static const String allPayments = '$baseUrl/payments/all';
  static const String stkPush = '$baseUrl/payments/stk-push';
  static const String stkQuery = '$baseUrl/payments/stk-query';
  // Correct route: PATCH /payments/:id/confirm — use confirmPayment(id)
  static String confirmPayment(dynamic id) => '$baseUrl/payments/$id/confirm';

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  static const String notifications = '$baseUrl/notifications';
  // Correct route: PATCH /notifications/read
  static const String markRead = '$baseUrl/notifications/read';
  // Correct route: POST /notifications/send
  static const String sendMessage = '$baseUrl/notifications/send';

  // ─── NOTICES ──────────────────────────────────────────────────────────────
  static const String notices = '$baseUrl/notices';

  // ─── HEALTH ───────────────────────────────────────────────────────────────
  static const String health = '$baseUrl/health';
}
