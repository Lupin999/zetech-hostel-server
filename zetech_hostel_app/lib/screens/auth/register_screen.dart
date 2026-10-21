import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../utils/api_client.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _regGroupController = TextEditingController();
  final _regSequenceController = TextEditingController();
  final _regYearController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _passwordVisible = false;
  bool _confirmPasswordVisible = false;
  bool _loading = false;
  bool _programmesLoading = true;
  List<Map<String, dynamic>> _programmes = [];
  String? _selectedCourse;
  String? _programmeLoadError;
  String? _error;
  String? _fieldError;

  @override
  void dispose() {
    _regGroupController.dispose();
    _regSequenceController.dispose();
    _regYearController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadProgrammes();
  }

  Future<void> _loadProgrammes() async {
    try {
      final response = await ApiClient.get(ApiConfig.programmes);
      if (!mounted) return;
      setState(() {
        _programmes = List<Map<String, dynamic>>.from(response);
        _programmesLoading = false;
        _programmeLoadError = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _programmesLoading = false;
        _programmeLoadError =
            'Could not load the programme list. Tap to retry.';
      });
    }
  }

  void _clearError() {
    setState(() {
      _error = null;
      _fieldError = null;
    });
  }

  Future<void> _handleRegister() async {
    final fullName = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final course = _selectedCourse ?? '';
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (fullName.isEmpty) {
      setState(() {
        _error = 'Full name is required';
        _fieldError = 'fullName';
      });
      return;
    }
    if (course.isEmpty) {
      setState(() {
        _error = 'Please select your programme';
        _fieldError = 'course';
      });
      return;
    }
    final programme = _programmes.firstWhere((item) => item['name'] == course);
    final regGroup = _regGroupController.text.trim();
    final regSequence = _regSequenceController.text.trim();
    final regYear = _regYearController.text.trim();
    final parsedGroup = int.tryParse(regGroup);
    if (parsedGroup == null || parsedGroup > 99) {
      setState(() {
        _error = 'Enter a number from 0 to 99';
        _fieldError = 'regGroup';
      });
      return;
    }
    final parsedSequence = int.tryParse(regSequence);
    if (parsedSequence == null || parsedSequence > 9999) {
      setState(() {
        _error = 'Enter a number from 0 to 9999';
        _fieldError = 'regSequence';
      });
      return;
    }
    if (!RegExp(r'^\d{4}$').hasMatch(regYear)) {
      setState(() {
        _error = 'Enter a 4-digit year';
        _fieldError = 'regYear';
      });
      return;
    }
    final regNo =
        '${programme['code']}-${regGroup.padLeft(2, '0')}-${regSequence.padLeft(4, '0')}/$regYear';
    if (email.isEmpty) {
      setState(() {
        _error = 'Email is required';
        _fieldError = 'email';
      });
      return;
    }
    if (!RegExp(r'^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      setState(() {
        _error = 'Enter a valid email address';
        _fieldError = 'email';
      });
      return;
    }
    if (password.isEmpty) {
      setState(() {
        _error = 'Password is required';
        _fieldError = 'password';
      });
      return;
    }
    if (password.length < 6) {
      setState(() {
        _error = 'Password must be at least 6 characters';
        _fieldError = 'password';
      });
      return;
    }
    if (!RegExp(r'^[a-zA-Z0-9]+$').hasMatch(password)) {
      setState(() {
        _error = 'Password must contain only letters and numbers';
        _fieldError = 'password';
      });
      return;
    }
    if (!RegExp(r'[A-Z]').hasMatch(password)) {
      setState(() {
        _error = 'Password must have at least one capital letter';
        _fieldError = 'password';
      });
      return;
    }
    if (!RegExp(r'[0-9]').hasMatch(password)) {
      setState(() {
        _error = 'Password must have at least one number';
        _fieldError = 'password';
      });
      return;
    }
    if (confirmPassword != password) {
      setState(() {
        _error = 'Passwords do not match';
        _fieldError = 'confirmPassword';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _fieldError = null;
    });

    try {
      final data = <String, dynamic>{
        'reg_no': regNo,
        'email': email,
        'full_name': fullName,
        'password': password,
      };
      if (phone.isNotEmpty) data['phone'] = phone;
      data['course'] = course;

      await context.read<AuthProvider>().register(data);
      Fluttertoast.showToast(
        msg: 'Registration successful! Opening your dashboard...',
        backgroundColor: Colors.green,
      );
      if (mounted) context.go('/dashboard');
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
    setState(() {
      _loading = false;
    });
  }

  String _registrationNumberPreview() {
    final matchingProgrammes = _programmes.where(
      (item) => item['name'] == _selectedCourse,
    );
    if (matchingProgrammes.isEmpty) return 'Select a programme to see its code';
    final programme = matchingProgrammes.first;
    final group = _regGroupController.text.trim();
    final sequence = _regSequenceController.text.trim();
    final year = _regYearController.text.trim();
    return '${programme['code']}-${group.isEmpty ? '00' : group.padLeft(2, '0')}-${sequence.isEmpty ? '0000' : sequence.padLeft(4, '0')}/${year.isEmpty ? 'YYYY' : year}';
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
              const Text(
                'Zetech Hostel',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Create Your Account',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
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
                  child: Text(
                    _error!,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                ),
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
              DropdownButtonFormField<String>(
                initialValue: _selectedCourse,
                isExpanded: true,
                dropdownColor: Colors.white,
                iconEnabledColor: AppTheme.primary,
                style: const TextStyle(color: Color(0xFF1F2937)),
                decoration: InputDecoration(
                  labelText: 'Programme',
                  labelStyle: const TextStyle(color: Color(0xFF4B5563)),
                  filled: true,
                  fillColor: Colors.white,
                  errorText: _fieldError == 'course' ? _error : null,
                  border: const OutlineInputBorder(),
                ),
                items: _programmes.map((programme) {
                  final name = programme['name'] as String;
                  final level = programme['level'] as String;
                  return DropdownMenuItem(
                    value: name,
                    child: Text(
                      '$level: $name',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF1F2937)),
                    ),
                  );
                }).toList(),
                onChanged: _programmesLoading || _programmes.isEmpty
                    ? null
                    : (value) {
                        _clearError();
                        setState(() {
                          _selectedCourse = value;
                        });
                      },
              ),
              const Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                    'Your registration number remains your student identifier. Programme selection does not verify enrollment.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ),
              ),
              if (_programmeLoadError != null)
                TextButton(
                  onPressed: _loadProgrammes,
                  child: Text(_programmeLoadError!),
                ),
              const SizedBox(height: 16),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Enter a number from 0-99, a number from 0-9999, and a four-digit year.',
                  style: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _regGroupController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(2),
                      ],
                      onChanged: (_) => _clearError(),
                      decoration: InputDecoration(
                        labelText: '00-99',
                        hintText: '01',
                        counterText: '',
                        errorText: _fieldError == 'regGroup' ? _error : null,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _regSequenceController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(4),
                      ],
                      onChanged: (_) => _clearError(),
                      decoration: InputDecoration(
                        labelText: '0000-9999',
                        hintText: '0046',
                        counterText: '',
                        errorText: _fieldError == 'regSequence' ? _error : null,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _regYearController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(4),
                      ],
                      onChanged: (_) => _clearError(),
                      decoration: InputDecoration(
                        labelText: 'Year',
                        hintText: '2024',
                        counterText: '',
                        errorText: _fieldError == 'regYear' ? _error : null,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Registration number: ${_registrationNumberPreview()}',
                  style: const TextStyle(
                    color: Color(0xFF4B5563),
                    fontSize: 12,
                  ),
                ),
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
                  icon: Icon(
                    _passwordVisible ? Icons.visibility_off : Icons.visibility,
                    color: AppTheme.primary,
                  ),
                  onPressed: () => setState(() {
                    _passwordVisible = !_passwordVisible;
                  }),
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
                  icon: Icon(
                    _confirmPasswordVisible
                        ? Icons.visibility_off
                        : Icons.visibility,
                    color: AppTheme.primary,
                  ),
                  onPressed: () => setState(() {
                    _confirmPasswordVisible = !_confirmPasswordVisible;
                  }),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'At least 6 characters; letters and numbers only, with at least one capital letter and one number. For better security, choose a unique password of 12+ characters.',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ),
              const SizedBox(height: 24),
              CustomButton(
                label: 'Create Account',
                isLoading: _loading,
                onPressed: _loading ? null : _handleRegister,
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text(
                  'Already have an account? Login',
                  style: TextStyle(color: AppTheme.primary),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
