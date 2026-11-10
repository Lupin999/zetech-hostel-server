import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../config/api_config.dart';
import '../../utils/api_client.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  int _step = 0;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final email = _emailController.text.trim();
    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email)) {
      setState(() => _error = 'Enter a valid email address');
      return;
    }
    await _run(() async {
      await ApiClient.post(ApiConfig.forgotPassword, body: {'email': email});
      if (mounted) setState(() => _step = 1);
      Fluttertoast.showToast(msg: 'Reset code sent');
    });
  }

  Future<void> _continueToReset() async {
    if (!RegExp(r'^\d{6}$').hasMatch(_codeController.text.trim())) {
      setState(() => _error = 'Enter the 6-digit code');
      return;
    }
    setState(() {
      _error = null;
      _step = 2;
    });
  }

  Future<void> _resetPassword() async {
    final password = _passwordController.text;
    if (password.length < 6 ||
        !RegExp(r'^[a-zA-Z0-9]+$').hasMatch(password) ||
        !RegExp(r'[A-Z]').hasMatch(password) ||
        !RegExp(r'[0-9]').hasMatch(password)) {
      setState(() {
        _error =
            'Use at least 6 letters and numbers, including a capital letter and a number';
      });
      return;
    }
    if (password != _confirmController.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    await _run(() async {
      await ApiClient.post(
        ApiConfig.resetPassword,
        body: {
          'email': _emailController.text.trim(),
          'code': _codeController.text.trim(),
          'newPassword': password,
        },
      );
      if (!mounted) return;
      Fluttertoast.showToast(msg: 'Password reset successfully');
      context.go('/login');
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        if (_error!.toLowerCase().contains('expired')) _step = 0;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final titles = [
      'Get a reset code',
      'Enter your reset code',
      'Choose a new password',
    ];
    final descriptions = [
      'We will email a 6-digit code to your account.',
      'Enter the code sent to your email address.',
      'Use at least 6 letters and numbers, including a capital letter and a number.',
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  titles[_step],
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(descriptions[_step]),
                const SizedBox(height: 20),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                if (_step == 0)
                  TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      labelText: 'Email address',
                      border: OutlineInputBorder(),
                    ),
                  ),
                if (_step == 1)
                  TextField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    decoration: const InputDecoration(
                      labelText: '6-digit code',
                      border: OutlineInputBorder(),
                    ),
                  ),
                if (_step == 2) ...[
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'New password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _confirmController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirm password',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _loading
                      ? null
                      : _step == 0
                      ? _sendCode
                      : _step == 1
                      ? _continueToReset
                      : _resetPassword,
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          _step == 0
                              ? 'Send reset code'
                              : _step == 1
                              ? 'Continue'
                              : 'Reset password',
                        ),
                ),
                if (_step > 0)
                  TextButton(
                    onPressed: _loading
                        ? null
                        : () => setState(() {
                            _step = 0;
                            _codeController.clear();
                            _error = null;
                          }),
                    child: const Text('Resend code'),
                  ),
                TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Back to login'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
