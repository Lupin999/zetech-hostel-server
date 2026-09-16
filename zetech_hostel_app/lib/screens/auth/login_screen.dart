import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Email tab
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _passwordVisible = false;

  // Phone tab
  String _countryCode = '+254';
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;

  // Shared state
  bool _loading = false;
  String? _error;
  String? _fieldError;

  static const List<Map<String, String>> _countries = [
    {'flag': '🇰🇪', 'code': '+254'},
    {'flag': '🇺🇬', 'code': '+256'},
    {'flag': '🇹🇿', 'code': '+255'},
    {'flag': '🇪🇹', 'code': '+251'},
    {'flag': '🇷🇼', 'code': '+250'},
    {'flag': '🇳🇬', 'code': '+234'},
    {'flag': '🇬🇭', 'code': '+233'},
    {'flag': '🇿🇦', 'code': '+27'},
    {'flag': '🇬🇧', 'code': '+44'},
    {'flag': '🇺🇸', 'code': '+1'},
    {'flag': '🇮🇳', 'code': '+91'},
    {'flag': '🇦🇪', 'code': '+971'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_error != null || _fieldError != null) {
      setState(() {
        _error = null;
        _fieldError = null;
      });
    }
  }

  Future<void> _handleEmailLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty) {
      setState(() { _error = 'Email is required'; _fieldError = 'email'; });
      return;
    }
    if (!RegExp(r'^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      setState(() { _error = 'Enter a valid email address'; _fieldError = 'email'; });
      return;
    }
    if (password.isEmpty) {
      setState(() { _error = 'Password is required'; _fieldError = 'password'; });
      return;
    }
    if (password.length < 6) {
      setState(() { _error = 'Password must be at least 6 characters'; _fieldError = 'password'; });
      return;
    }
    if (!RegExp(r'^[a-zA-Z0-9]+$').hasMatch(password)) {
      setState(() { _error = 'Password must contain only letters and numbers'; _fieldError = 'password'; });
      return;
    }
    if (!RegExp(r'[A-Z]').hasMatch(password)) {
      setState(() { _error = 'Password must have at least one capital letter'; _fieldError = 'password'; });
      return;
    }
    if (!RegExp(r'[0-9]').hasMatch(password)) {
      setState(() { _error = 'Password must have at least one number'; _fieldError = 'password'; });
      return;
    }

    setState(() { _loading = true; _error = null; _fieldError = null; });
    try {
      await context.read<AuthProvider>().login(email, password);
      if (mounted) context.go('/dashboard');
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); });
    }
    setState(() { _loading = false; });
  }

  Future<void> _handleSendOtp() async {
    final phone = _phoneController.text.trim();

    if (phone.isEmpty) {
      setState(() { _error = 'Phone number is required'; _fieldError = 'phone'; });
      return;
    }
    if (RegExp(r'[a-zA-Z]').hasMatch(phone)) {
      setState(() { _error = 'Phone number must not contain letters'; _fieldError = 'phone'; });
      return;
    }
    if (phone.length < 7 || phone.length > 12) {
      setState(() { _error = 'Phone number must be 7-12 digits'; _fieldError = 'phone'; });
      return;
    }

    final fullPhone = _countryCode + (phone.startsWith('0') ? phone.substring(1) : phone);

    setState(() { _loading = true; _error = null; _fieldError = null; });
    try {
      await context.read<AuthProvider>().sendOtp(fullPhone);
      setState(() { _otpSent = true; });
      Fluttertoast.showToast(msg: 'OTP sent successfully', backgroundColor: Colors.green);
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); });
    }
    setState(() { _loading = false; });
  }

  Future<void> _handleVerifyOtp() async {
    final otp = _otpController.text.trim();

    if (otp.length != 6 || !RegExp(r'^\d{6}$').hasMatch(otp)) {
      setState(() { _error = 'Enter a valid 6-digit OTP'; _fieldError = 'otp'; });
      return;
    }

    final phone = _phoneController.text.trim();
    final fullPhone = _countryCode + (phone.startsWith('0') ? phone.substring(1) : phone);

    setState(() { _loading = true; _error = null; _fieldError = null; });
    try {
      await context.read<AuthProvider>().verifyOtp(fullPhone, otp);
      if (mounted) context.go('/dashboard');
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); });
    }
    setState(() { _loading = false; });
  }

  Widget _buildErrorBox() {
    if (_error == null) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Text(_error!, style: TextStyle(color: Colors.red.shade700)),
    );
  }

  Widget _buildEmailTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          const Text('Zetech Hostel', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary)),
          const SizedBox(height: 8),
          const Text('Welcome Back', style: TextStyle(fontSize: 16, color: Colors.grey)),
          const SizedBox(height: 32),
          _buildErrorBox(),
          CustomTextField(
            label: 'Email',
            hint: 'Enter your email',
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            errorText: _fieldError == 'email' ? _error : null,
            onChanged: (_) => _clearError(),
          ),
          const SizedBox(height: 16),
          CustomTextField(
            label: 'Password',
            hint: 'Enter your password',
            controller: _passwordController,
            obscureText: !_passwordVisible,
            errorText: _fieldError == 'password' ? _error : null,
            onChanged: (_) => _clearError(),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              icon: Icon(_passwordVisible ? Icons.visibility_off : Icons.visibility, color: AppTheme.primary),
              onPressed: () => setState(() { _passwordVisible = !_passwordVisible; }),
            ),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Must be 6+ characters, letters and numbers only, at least one capital letter',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ),
          const SizedBox(height: 24),
          CustomButton(label: 'Login', isLoading: _loading, onPressed: _loading ? null : _handleEmailLogin),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => context.go('/register'),
            child: const Text('No account? Register', style: TextStyle(color: AppTheme.primary)),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          const Text('Zetech Hostel', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary)),
          const SizedBox(height: 8),
          const Text('Login with Phone', style: TextStyle(fontSize: 16, color: Colors.grey)),
          const SizedBox(height: 32),
          _buildErrorBox(),
          Row(
            children: [
              DropdownButton<String>(
                value: _countryCode,
                items: _countries.map((c) => DropdownMenuItem(
                  value: c['code'],
                  child: Text('${c['flag']} ${c['code']}'),
                )).toList(),
                onChanged: (val) => setState(() { _countryCode = val!; }),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomTextField(
                  label: 'Phone',
                  hint: '712345678',
                  controller: _phoneController,
                  keyboardType: TextInputType.number,
                  errorText: _fieldError == 'phone' ? _error : null,
                  onChanged: (_) => _clearError(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (!_otpSent) ...[
            CustomButton(label: 'Send OTP', isLoading: _loading, onPressed: _loading ? null : _handleSendOtp),
          ] else ...[
            Text('Code sent to your phone', style: TextStyle(color: Colors.green.shade700)),
            const SizedBox(height: 16),
            CustomTextField(
              label: 'OTP Code',
              hint: '000000',
              controller: _otpController,
              keyboardType: TextInputType.number,
              errorText: _fieldError == 'otp' ? _error : null,
              onChanged: (_) => _clearError(),
            ),
            const SizedBox(height: 24),
            CustomButton(label: 'Verify & Login', isLoading: _loading, onPressed: _loading ? null : _handleVerifyOtp),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => setState(() { _otpSent = false; _otpController.clear(); _error = null; }),
              child: const Text('Change phone number or resend code', style: TextStyle(color: AppTheme.primary)),
            ),
          ],
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => context.go('/register'),
            child: const Text('No account? Register', style: TextStyle(color: AppTheme.primary)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            TabBar(
              controller: _tabController,
              labelColor: AppTheme.primary,
              unselectedLabelColor: Colors.grey,
              indicatorColor: AppTheme.primary,
              tabs: const [Tab(text: 'Email'), Tab(text: 'Phone')],
              onTap: (_) => _clearError(),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [_buildEmailTab(), _buildPhoneTab()],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
