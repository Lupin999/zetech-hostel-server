import 'package:flutter/material.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/health_model.dart';
import '../../models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../utils/api_client.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';
import '../../widgets/common/loading_spinner.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _loading = true;
  bool _savingProfile = false;
  bool _savingHealth = false;
  bool _changingPassword = false;
  List<dynamic> _bookings = [];
  List<dynamic> _payments = [];
  HealthProfile? _healthProfile;

  final _fullNameController = TextEditingController();
  final _courseController = TextEditingController();
  final _medicalController = TextEditingController();
  final _dietaryController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _currentPwVisible = false;
  bool _newPwVisible = false;
  bool _confirmPwVisible = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _fullNameController.text = user?.fullName ?? '';
    _courseController.text = user?.course ?? '';
    _loadData();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _courseController.dispose();
    _medicalController.dispose();
    _dietaryController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; });
    await Future.wait([_fetchBookings(), _fetchPayments(), _fetchHealth()]);
    setState(() { _loading = false; });
  }

  Future<void> _fetchBookings() async {
    try {
      // Server returns a flat array
      final res = await ApiClient.get(ApiConfig.myBookings);
      _bookings = res is List ? res : [];
    } catch (_) {}
  }

  Future<void> _fetchPayments() async {
    try {
      // Server returns a flat array
      final res = await ApiClient.get(ApiConfig.myPayments);
      _payments = res is List ? res : [];
    } catch (_) {}
  }

  Future<void> _fetchHealth() async {
    try {
      // Server returns the health profile object directly
      final res = await ApiClient.get(ApiConfig.health);
      final hp = HealthProfile.fromJson(Map<String, dynamic>.from(res is Map ? res : {}));
      setState(() {
        _healthProfile = hp;
        _medicalController.text = hp.medicalConditions ?? '';
        _dietaryController.text = hp.dietaryRestrictions ?? '';
      });
    } catch (_) {}
  }

  int get _totalBookings => _bookings.length;
  int get _paidCount => _payments.where((p) => p['status'] == 'confirmed').length;
  int get _unpaidCount => _bookings.where((b) => b['status'] == 'approved').length - _paidCount;

  Future<void> _updateProfile() async {
    setState(() { _savingProfile = true; });
    try {
      await ApiClient.put('${ApiConfig.baseUrl}/auth/profile/info', body: {
        'full_name': _fullNameController.text.trim(),
        'course': _courseController.text.trim(),
      });
      final auth = context.read<AuthProvider>();
      auth.updateUser(User(
        id: auth.user?.id,
        regNo: auth.user?.regNo,
        email: auth.user?.email,
        fullName: _fullNameController.text.trim(),
        role: auth.user?.role,
        campus: auth.user?.campus,
        phone: auth.user?.phone,
        course: _courseController.text.trim(),
      ));
      Fluttertoast.showToast(msg: 'Profile updated successfully', backgroundColor: Colors.green);
    } catch (e) {
      AwesomeDialog(context: context, dialogType: DialogType.error, title: 'Error', desc: e.toString().replaceFirst('Exception: ', ''), btnOkOnPress: () {}).show();
    }
    setState(() { _savingProfile = false; });
  }

  Future<void> _saveHealth() async {
    setState(() { _savingHealth = true; });
    try {
      // Server model expects snake_case keys
      await ApiClient.post(ApiConfig.health, body: {
        'medical_conditions': _medicalController.text.trim(),
        'dietary_restrictions': _dietaryController.text.trim(),
      });
      Fluttertoast.showToast(msg: 'Health profile saved', backgroundColor: Colors.green);
    } catch (e) {
      AwesomeDialog(context: context, dialogType: DialogType.error, title: 'Error', desc: e.toString().replaceFirst('Exception: ', ''), btnOkOnPress: () {}).show();
    }
    setState(() { _savingHealth = false; });
  }

  Future<void> _changePassword() async {
    final current = _currentPasswordController.text;
    final newPw = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;

    if (current.isEmpty) { Fluttertoast.showToast(msg: 'Current password is required'); return; }
    if (newPw.length < 6) { Fluttertoast.showToast(msg: 'New password must be at least 6 characters'); return; }
    if (!RegExp(r'^[a-zA-Z0-9]+$').hasMatch(newPw)) { Fluttertoast.showToast(msg: 'Letters and numbers only'); return; }
    if (!RegExp(r'[A-Z]').hasMatch(newPw)) { Fluttertoast.showToast(msg: 'Need at least one capital letter'); return; }
    if (!RegExp(r'[0-9]').hasMatch(newPw)) { Fluttertoast.showToast(msg: 'Need at least one number'); return; }
    if (confirm != newPw) { Fluttertoast.showToast(msg: 'Passwords do not match'); return; }

    setState(() { _changingPassword = true; });
    try {
      await ApiClient.put('${ApiConfig.baseUrl}/auth/profile', body: {
        'currentPassword': current,
        'newPassword': newPw,
      });
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      AwesomeDialog(context: context, dialogType: DialogType.success, title: 'Password Changed', desc: 'Password changed successfully!', btnOkOnPress: () {}).show();
    } catch (e) {
      AwesomeDialog(context: context, dialogType: DialogType.error, title: 'Error', desc: e.toString().replaceFirst('Exception: ', ''), btnOkOnPress: () {}).show();
    }
    setState(() { _changingPassword = false; });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
      ),
      body: _loading
          ? const LoadingSpinner()
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Section 1 — Profile Header
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 36,
                              backgroundColor: AppTheme.primary,
                              child: Text(user?.fullName?.isNotEmpty == true ? user!.fullName![0].toUpperCase() : '?', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(height: 12),
                            Text(user?.fullName ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            Text(user?.email ?? '', style: const TextStyle(color: Colors.grey)),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Chip(label: Text(user?.role ?? ''), backgroundColor: AppTheme.primary.withOpacity(0.1)),
                                const SizedBox(width: 8),
                                Chip(label: Text(user?.campus ?? ''), backgroundColor: Colors.grey.shade200),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 2 — Booking Stats
                    Row(
                      children: [
                        _statCard('Total', _totalBookings, Colors.blue),
                        const SizedBox(width: 8),
                        _statCard('Paid', _paidCount, Colors.green),
                        const SizedBox(width: 8),
                        _statCard('Unpaid', _unpaidCount < 0 ? 0 : _unpaidCount, Colors.orange),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Section 3 — Edit Profile
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(children: [Icon(Icons.person, color: AppTheme.primary), SizedBox(width: 8), Text('Personal Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))]),
                            const SizedBox(height: 16),
                            CustomTextField(label: 'Full Name', controller: _fullNameController),
                            const SizedBox(height: 12),
                            CustomTextField(label: 'Course', controller: _courseController),
                            const SizedBox(height: 16),
                            CustomButton(label: 'Update Profile', isLoading: _savingProfile, onPressed: _savingProfile ? null : _updateProfile),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 4 — Health Profile
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(children: [Icon(Icons.medical_services, color: AppTheme.primary), SizedBox(width: 8), Text('Health & Meals Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))]),
                            const SizedBox(height: 16),
                            CustomTextField(label: 'Medical Conditions', hint: 'e.g. diabetes, asthma', controller: _medicalController),
                            const SizedBox(height: 12),
                            CustomTextField(label: 'Dietary Restrictions', hint: 'e.g. no pork, vegetarian', controller: _dietaryController),
                            const SizedBox(height: 16),
                            CustomButton(label: 'Save Health Profile', isLoading: _savingHealth, onPressed: _savingHealth ? null : _saveHealth),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 5 — Change Password
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(children: [Icon(Icons.lock, color: AppTheme.primary), SizedBox(width: 8), Text('Change Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16))]),
                            const SizedBox(height: 16),
                            CustomTextField(label: 'Current Password', controller: _currentPasswordController, obscureText: !_currentPwVisible),
                            Align(alignment: Alignment.centerRight, child: IconButton(icon: Icon(_currentPwVisible ? Icons.visibility_off : Icons.visibility, size: 20), onPressed: () => setState(() { _currentPwVisible = !_currentPwVisible; }))),
                            CustomTextField(label: 'New Password', controller: _newPasswordController, obscureText: !_newPwVisible),
                            Align(alignment: Alignment.centerRight, child: IconButton(icon: Icon(_newPwVisible ? Icons.visibility_off : Icons.visibility, size: 20), onPressed: () => setState(() { _newPwVisible = !_newPwVisible; }))),
                            CustomTextField(label: 'Confirm New Password', controller: _confirmPasswordController, obscureText: !_confirmPwVisible),
                            Align(alignment: Alignment.centerRight, child: IconButton(icon: Icon(_confirmPwVisible ? Icons.visibility_off : Icons.visibility, size: 20), onPressed: () => setState(() { _confirmPwVisible = !_confirmPwVisible; }))),
                            Text('New password must be 6+ characters, letters and numbers only, at least one capital letter', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                            const SizedBox(height: 16),
                            CustomButton(label: 'Change Password', isLoading: _changingPassword, onPressed: _changingPassword ? null : _changePassword),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _statCard(String label, int count, Color color) {
    return Expanded(
      child: Card(
        color: color.withOpacity(0.1),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Text('$count', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: TextStyle(fontSize: 12, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
