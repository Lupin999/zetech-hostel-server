import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _regNoController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _courseController = TextEditingController();
  final _campusController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _passwordVisible = false;
  bool _confirmPasswordVisible = false;
  bool _loading = false;
  String? _error;
  String? _fieldError;

  @override
  void dispose() {
    _regNoController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _courseController.dispose();
    _campusController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_error != null || _fieldError != null) {
      setState(() { _error = null; _fieldError = null; });
    }
  }

  Future<void> _handleRegister() async {
    final regNo = _regNoController.text.trim();
    final fullName = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final course = _courseController.text.trim();
    final campus = _campusController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (regNo.isEmpty) {
      setState(() { _error = 'Registration number is required'; _fieldError = 'regNo'; });
      return;
    }
    if (fullName.isEmpty) {
      setState(() { _error = 'Full name is required'; _fieldError = 'fullName'; });
      return;
    }
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
    if (confirmPassword != password) {
      setState(() { _error = 'Passwords do not match'; _fieldError = 'confirmPassword'; });
      return;
    }
    if (campus.isEmpty) {
      setState(() { _error = 'Campus is required'; _fieldError = 'campus'; });
      return;
    }

    setState(() { _loading = true; _error = null; _fieldError = null; });

    try {
      final data = <String, dynamic>{
        'reg_no': regNo,
        'email': email,
        'full_name': fullName,
        'password': password,
        'campus': campus,
      };
      if (phone.isNotEmpty) data['phone'] = phone;
      if (course.isNotEmpty) data['course'] = course;

      await context.read<AuthProvider>().register(data);
      Fluttertoast.showToast(msg: 'Registration successful! Please login', backgroundColor: Colors.green);
      await Future.delayed(const Duration(milliseconds: 1500));
      if (mounted) context.go('/login');
    } catch (e) {
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); });
    }
    setState(() { _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 32),
              const Text('Zetech Hostel', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary)),
              const SizedBox(height: 8),
              const Text('Create Your Account', style: TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 32),
              if (_error != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                ),
              CustomTextField(
                label: 'Reg Number',
                hint: 'ZU2024001',
                controller: _regNoController,
                errorText: _fieldError == 'regNo' ? _error : null,
                onChanged: (_) => _clearError(),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Full Name',
                hint: 'John Doe',
                controller: _fullNameController,
                errorText: _fieldError == 'fullName' ? _error : null,
                onChanged: (_) => _clearError(),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Email',
                hint: 'you@example.com',
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                errorText: _fieldError == 'email' ? _error : null,
                onChanged: (_) => _clearError(),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Phone Number (optional)',
                hint: '0712345678',
                controller: _phoneController,
                keyboardType: TextInputType.number,
                onChanged: (_) => _clearError(),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Course (optional)',
                hint: 'Bachelor of Science in IT',
                controller: _courseController,
                onChanged: (_) => _clearError(),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Campus',
                hint: 'Nairobi',
                controller: _campusController,
                errorText: _fieldError == 'campus' ? _error : null,
                onChanged: (_) => _clearError(),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Password',
                hint: 'Enter password',
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
              CustomTextField(
                label: 'Confirm Password',
                hint: 'Re-enter password',
                controller: _confirmPasswordController,
                obscureText: !_confirmPasswordVisible,
                errorText: _fieldError == 'confirmPassword' ? _error : null,
                onChanged: (_) => _clearError(),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  icon: Icon(_confirmPasswordVisible ? Icons.visibility_off : Icons.visibility, color: AppTheme.primary),
                  onPressed: () => setState(() { _confirmPasswordVisible = !_confirmPasswordVisible; }),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Password must be 6+ characters, letters and numbers only, at least one capital letter and at least one number',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ),
              const SizedBox(height: 24),
              CustomButton(label: 'Create Account', isLoading: _loading, onPressed: _loading ? null : _handleRegister),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Already have an account? Login', style: TextStyle(color: AppTheme.primary)),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
