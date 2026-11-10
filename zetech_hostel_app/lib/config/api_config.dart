class ApiConfig {
  // Override API_BASE_URL at build/run time when testing against another server.
  // Examples:
  // flutter run --dart-define=API_BASE_URL=http://10.50.57.158:5000/api
  // flutter build apk --release --dart-define=API_BASE_URL=https://api.example/api
  static const bool isProduction = bool.fromEnvironment('dart.vm.product');
  static const String _configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
  );
  static const String _productionDefaultBaseUrl =
      'https://zetech-hostel-api.onrender.com/api';

  static const String _defaultBaseUrl = _productionDefaultBaseUrl;

  static String? get configurationError {
    final value = _configuredBaseUrl.trim().isNotEmpty
        ? _configuredBaseUrl.trim()
        : _defaultBaseUrl;
    final uri = Uri.tryParse(value);
    if (uri == null ||
        !uri.hasAuthority ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      return 'API_BASE_URL must be a valid http:// or https:// server URL.';
    }
    if (isProduction && uri.scheme != 'https') {
      return 'Production API_BASE_URL must use HTTPS.';
    }
    return null;
  }

  static String get baseUrl {
    final error = configurationError;
    if (error != null) throw StateError(error);
    final configured = _configuredBaseUrl.trim();
    final value = configured.isNotEmpty ? configured : _defaultBaseUrl;
    return value.replaceFirst(RegExp(r'/+$'), '');
  }

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  static final String login = '$baseUrl/auth/login';
  static final String register = '$baseUrl/auth/register';
  static final String verify = '$baseUrl/auth/verify';
  static final String sendOtp = '$baseUrl/auth/send-otp';
  static final String verifyOtp = '$baseUrl/auth/verify-otp';
  // Correct route on server: PUT /auth/profile (change password)
  static final String changePassword = '$baseUrl/auth/profile';
  static final String profileInfo = '$baseUrl/auth/profile/info';
  static final String createAdmin = '$baseUrl/auth/create-admin';
  static final String forgotPassword = '$baseUrl/auth/forgot-password';
  static final String resetPassword = '$baseUrl/auth/reset-password';
  static final String programmes = '$baseUrl/programmes';

  // ─── ROOMS ────────────────────────────────────────────────────────────────
  static final String rooms = '$baseUrl/rooms';
  // Usage: '${ApiConfig.roomBeds(id)}'
  static String roomBeds(dynamic id) => '$baseUrl/rooms/$id/beds';

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────
  static final String bookings = '$baseUrl/bookings';
  static final String activeBooking = '$baseUrl/bookings/active';
  static final String bookingStatus = '$baseUrl/bookings/status';
  static final String myBookings = '$baseUrl/bookings/my';
  static final String allBookings = '$baseUrl/bookings/all';
  static final String toggleBookings = '$baseUrl/bookings/toggle';

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  static final String myPayments = '$baseUrl/payments/my';
  static final String allPayments = '$baseUrl/payments/all';
  static final String stkPush = '$baseUrl/payments/stk-push';
  static final String stkQuery = '$baseUrl/payments/stk-query';
  static String paymentReceipt(dynamic id) =>
      '$baseUrl/operations/payments/$id/receipt';
  static final String deleteAccount = '$baseUrl/auth/account';

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  static final String notifications = '$baseUrl/notifications';
  // Correct route: PATCH /notifications/read
  static final String markRead = '$baseUrl/notifications/read';
  // Correct route: POST /notifications/send
  static final String sendMessage = '$baseUrl/notifications/send';

  // ─── NOTICES ──────────────────────────────────────────────────────────────
  static final String notices = '$baseUrl/notices';

  // ─── HEALTH ───────────────────────────────────────────────────────────────
  static final String status = '$baseUrl/status';
  static final String health = '$baseUrl/health';
  static final String operations = '$baseUrl/operations';
}
