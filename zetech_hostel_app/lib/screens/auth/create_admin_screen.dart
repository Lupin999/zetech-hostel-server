import 'package:flutter/material.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:go_router/go_router.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../utils/api_client.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';

class CreateAdminScreen extends StatefulWidget {
  const CreateAdminScreen({super.key});

  @override
  State<CreateAdminScreen> createState() => _CreateAdminScreenState();
}

class _CreateAdminScreenState extends State<CreateAdminScreen> {
  final _regNoController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _campusController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _adminSecretController = TextEditingController();

  bool _passwordVisible = false;
  bool _confirmPasswordVisible = false;
  bool _secretVisible = false;
  bool _loading = false;
  String? _error;
  String? _fieldError;

  @override
  void dispose() {
    _regNoController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _campusController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _adminSecretController.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_error != null || _fieldError != null) setState(() { _error = null; _fieldError = null; });
  }

  Future<void> _handleCreateAdmin() async {
    final regNo = _regNoController.text.trim();
    final fullName = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final campus = _campusController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;
    final adminSecret = _adminSecretController.text.trim();

    if (regNo.isEmpty) { setState(() { _error = 'Reg number is required'; _fieldError = 'regNo'; }); return; }
    if (fullName.isEmpty) { setState(() { _error = 'Full name is required'; _fieldError = 'fullName'; }); return; }
    if (email.isEmpty || !RegExp(r'^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) { setState(() { _error = 'Valid email is required'; _fieldError = 'email'; }); return; }
    if (password.isEmpty || password.length < 6) { setState(() { _error = 'Password must be at least 6 characters'; _fieldError = 'password'; }); return; }
    if (!RegExp(r'^[a-zA-Z0-9]+$').hasMatch(password)) { setState(() { _error = 'Password: letters and numbers only'; _fieldError = 'password'; }); return; }
    if (!RegExp(r'[A-Z]').hasMatch(password)) { setState(() { _error = 'Need at least one capital letter'; _fieldError = 'password'; }); return; }
    if (!RegExp(r'[0-9]').hasMatch(password)) { setState(() { _error = 'Need at least one number'; _fieldError = 'password'; }); return; }
    if (confirmPassword != password) { setState(() { _error = 'Passwords do not match'; _fieldError = 'confirmPassword'; }); return; }
    if (campus.isEmpty) { setState(() { _error = 'Campus is required'; _fieldError = 'campus'; }); return; }
    if (adminSecret.isEmpty) { setState(() { _error = 'Admin secret code is required'; _fieldError = 'adminSecret'; }); return; }

    setState(() { _loading = true; _error = null; _fieldError = null; });
    try {
      await ApiClient.post(ApiConfig.createAdmin, body: {
        'reg_no': regNo,
        'full_name': fullName,
        'email': email,
        'password': password,
        'campus': campus,
        'adminSecret': adminSecret,
        if (phone.isNotEmpty) 'phone': phone,
      });
      AwesomeDialog(
        context: context, dialogType: DialogType.success,
        title: 'Success', desc: 'Admin account created successfully!',
        btnOkOnPress: () => context.go('/login'),
      ).show();
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
              const Text('Admin Setup', style: TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 32),
              if (_error != null)
                Container(
                  width: double.infinity, margin: const EdgeInsets.only(bottom: 16), padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.red.shade200)),
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                ),
              CustomTextField(label: 'Reg Number', hint: 'ADM001', controller: _regNoController, errorText: _fieldError == 'regNo' ? _error : null, onChanged: (_) => _clearError()),
              const SizedBox(height: 16),
              CustomTextField(label: 'Full Name', controller: _fullNameController, errorText: _fieldError == 'fullName' ? _error : null, onChanged: (_) => _clearError()),
              const SizedBox(height: 16),
              CustomTextField(label: 'Email', controller: _emailController, keyboardType: TextInputType.emailAddress, errorText: _fieldError == 'email' ? _error : null, onChanged: (_) => _clearError()),
              const SizedBox(height: 16),
              CustomTextField(label: 'Phone (optional)', controller: _phoneController, keyboardType: TextInputType.number, onChanged: (_) => _clearError()),
              const SizedBox(height: 16),
              CustomTextField(label: 'Campus', hint: 'Nairobi', controller: _campusController, errorText: _fieldError == 'campus' ? _error : null, onChanged: (_) => _clearError()),
              const SizedBox(height: 16),
              CustomTextField(label: 'Password', controller: _passwordController, obscureText: !_passwordVisible, errorText: _fieldError == 'password' ? _error : null, onChanged: (_) => _clearError()),
              Align(alignment: Alignment.centerRight, child: IconButton(icon: Icon(_passwordVisible ? Icons.visibility_off : Icons.visibility, color: AppTheme.primary), onPressed: () => setState(() { _passwordVisible = !_passwordVisible; }))),
              CustomTextField(label: 'Confirm Password', controller: _confirmPasswordController, obscureText: !_confirmPasswordVisible, errorText: _fieldError == 'confirmPassword' ? _error : null, onChanged: (_) => _clearError()),
              Align(alignment: Alignment.centerRight, child: IconButton(icon: Icon(_confirmPasswordVisible ? Icons.visibility_off : Icons.visibility, color: AppTheme.primary), onPressed: () => setState(() { _confirmPasswordVisible = !_confirmPasswordVisible; }))),
              CustomTextField(label: 'Admin Secret Code', controller: _adminSecretController, obscureText: !_secretVisible, errorText: _fieldError == 'adminSecret' ? _error : null, onChanged: (_) => _clearError()),
              Align(alignment: Alignment.centerRight, child: IconButton(icon: Icon(_secretVisible ? Icons.visibility_off : Icons.visibility, color: AppTheme.primary), onPressed: () => setState(() { _secretVisible = !_secretVisible; }))),
              const SizedBox(height: 24),
              CustomButton(label: 'Create Admin Account', isLoading: _loading, onPressed: _loading ? null : _handleCreateAdmin),
              const SizedBox(height: 16),
              TextButton(onPressed: () => context.go('/login'), child: const Text('Back to Login', style: TextStyle(color: AppTheme.primary))),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
