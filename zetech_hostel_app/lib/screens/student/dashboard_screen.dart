import 'package:flutter/material.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../models/health_model.dart';
import '../../models/notice_model.dart';
import '../../models/notification_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../utils/api_client.dart';
import '../../utils/helpers.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/loading_spinner.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Booking? _activeBooking;
  Notice? _latestNotice;
  HealthProfile? _healthProfile;
  final _medicalController = TextEditingController();
  final _dietaryController = TextEditingController();
  bool _noticeVisible = true;
  bool _savingHealth = false;
  bool _loading = true;
  int _unreadCount = 0;
  List<NotificationModel> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _medicalController.dispose();
    _dietaryController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; });
    await Future.wait([
      _fetchActiveBooking(),
      _fetchLatestNotice(),
      _fetchHealthProfile(),
      _fetchUnreadCount(),
    ]);
    setState(() { _loading = false; });
  }

  Future<void> _fetchActiveBooking() async {
    try {
      // Server returns the booking object directly (not nested under 'booking')
      final res = await ApiClient.get(ApiConfig.activeBooking);
      setState(() {
        _activeBooking = res is Map ? Booking.fromJson(Map<String, dynamic>.from(res)) : null;
      });
    } catch (_) {
      setState(() { _activeBooking = null; });
    }
  }

  Future<void> _fetchLatestNotice() async {
    try {
      // Server returns a flat array of notice objects
      final res = await ApiClient.get(ApiConfig.notices);
      final list = res is List ? res : [];
      if (list.isNotEmpty) {
        setState(() { _latestNotice = Notice.fromJson(Map<String, dynamic>.from(list.first)); });
      }
    } catch (_) {}
  }

  Future<void> _fetchHealthProfile() async {
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

  Future<void> _fetchUnreadCount() async {
    try {
      // Server returns a flat array of notification objects
      final res = await ApiClient.get(ApiConfig.notifications);
      final list = res is List ? res : [];
      setState(() {
        _notifications = list
            .map((n) => NotificationModel.fromJson(Map<String, dynamic>.from(n)))
            .toList();
        _unreadCount = _notifications.where((n) => n.isRead == false).length;
      });
    } catch (_) {}
  }

  Future<void> _saveHealthProfile() async {
    setState(() { _savingHealth = true; });
    try {
      // Server model expects snake_case keys
      await ApiClient.post(ApiConfig.health, body: {
        'medical_conditions': _medicalController.text.trim(),
        'dietary_restrictions': _dietaryController.text.trim(),
      });
      Fluttertoast.showToast(msg: 'Health profile saved', backgroundColor: Colors.green);
    } catch (e) {
      Fluttertoast.showToast(msg: e.toString().replaceFirst('Exception: ', ''), backgroundColor: Colors.red);
    }
    setState(() { _savingHealth = false; });
  }

  void _showLogoutDialog() {
    final auth = context.read<AuthProvider>();
    AwesomeDialog(
      context: context,
      dialogType: DialogType.info,
      title: 'Goodbye',
      desc: 'Hey ${auth.user?.fullName ?? 'Student'}, wishing you good health and success!',
      btnOkText: 'Logout',
      btnCancelText: 'Stay',
      btnOkOnPress: () async {
        await auth.logout();
        if (mounted) context.go('/login');
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _showNotifications() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Notifications', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(
                  onPressed: () async {
                    try {
                      // Server route: PATCH /notifications/read
                      await ApiClient.patch(ApiConfig.markRead);
                      setState(() {
                        _unreadCount = 0;
                        _notifications = _notifications
                            .map((n) => NotificationModel(
                                  id: n.id,
                                  userId: n.userId,
                                  message: n.message,
                                  type: n.type,
                                  isRead: true,
                                  createdAt: n.createdAt,
                                ))
                            .toList();
                      });
                    } catch (_) {}
                    Navigator.pop(context);
                  },
                  child: const Text('Mark all read'),
                ),
              ],
            ),
            const Divider(),
            if (_notifications.isEmpty)
              const Padding(padding: EdgeInsets.all(24), child: Text('No notifications', style: TextStyle(color: Colors.grey)))
            else
              ...(_notifications.take(10).map((n) => ListTile(
                leading: Icon(n.isRead == true ? Icons.notifications_none : Icons.notifications_active, color: n.isRead == true ? Colors.grey : AppTheme.primary),
                title: Text(n.message ?? '', style: const TextStyle(fontSize: 13)),
                subtitle: Text(Helpers.formatDate(n.createdAt), style: const TextStyle(fontSize: 11)),
              ))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Zetech Hostel'),
        actions: [
          Badge(
            label: _unreadCount > 0 ? Text('$_unreadCount') : null,
            isLabelVisible: _unreadCount > 0,
            child: IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: _showNotifications),
          ),
          IconButton(icon: const Icon(Icons.brightness_6), onPressed: () => context.read<ThemeProvider>().toggleTheme()),
          IconButton(icon: const Icon(Icons.logout), onPressed: _showLogoutDialog),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: Colors.grey,
        currentIndex: 0,
        onTap: (i) {
          switch (i) {
            case 0: break;
            case 1: context.go('/rooms');
            case 2: context.go('/my-bookings');
            case 3: context.go('/menu');
            case 4: context.go('/notices');
            case 5: context.go('/profile');
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.hotel), label: 'Rooms'),
          BottomNavigationBarItem(icon: Icon(Icons.book), label: 'Bookings'),
          BottomNavigationBarItem(icon: Icon(Icons.restaurant_menu), label: 'Menu'),
          BottomNavigationBarItem(icon: Icon(Icons.campaign), label: 'Notices'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
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
                    _buildWelcomeBanner(auth),
                    const SizedBox(height: 16),
                    if (_latestNotice != null && _noticeVisible) _buildNoticeAlert(),
                    _buildBookingCard(),
                    const SizedBox(height: 16),
                    _buildHealthCard(),
                    const SizedBox(height: 16),
                    _buildAccountCard(auth),
                    const SizedBox(height: 16),
                    _buildWardenCard(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildWelcomeBanner(AuthProvider auth) {
    return Container(
      height: 220,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        image: const DecorationImage(image: AssetImage('assets/images/campus1.jpg'), fit: BoxFit.cover),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.black.withOpacity(0.6),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Thanks for Choosing Zetech Hostel', style: TextStyle(color: AppTheme.secondary, fontSize: 22, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            const SizedBox(height: 12),
            Text('Welcome, ${auth.user?.fullName ?? 'Student'}', style: const TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
      ),
    );
  }

  Widget _buildNoticeAlert() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber, color: Colors.orange),
              const SizedBox(width: 8),
              Expanded(child: Text(_latestNotice!.title ?? '', style: const TextStyle(fontWeight: FontWeight.bold))),
              IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() { _noticeVisible = false; })),
            ],
          ),
          Text(_latestNotice!.message ?? '', style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildBookingCard() {
    if (_activeBooking == null) {
      return Card(
        color: Colors.blue.shade50,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Icon(Icons.hotel, size: 48, color: AppTheme.primary),
              const SizedBox(height: 12),
              const Text('No Active Booking', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              CustomButton(label: 'Browse Rooms', onPressed: () => context.go('/rooms')),
            ],
          ),
        ),
      );
    }

    final b = _activeBooking!;
    if (b.status == 'approved') {
      return Card(
        color: Colors.green.shade50,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.check_circle, color: Colors.green.shade700),
                const SizedBox(width: 8),
                Text('Booking Approved', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade700, fontSize: 16)),
              ]),
              const SizedBox(height: 12),
              Text('Room: ${b.roomNumber ?? ''} • Bed: ${b.bedNumber ?? ''}'),
              Text('Hostel: ${b.hostel ?? ''}'),
              Text('Semester: ${b.semester ?? ''}'),
              Text('Arrival: ${Helpers.formatDate(b.arrivalDate)}'),
              const SizedBox(height: 12),
              CustomButton(label: 'Pay Now', color: AppTheme.secondary, onPressed: () {}),
            ],
          ),
        ),
      );
    }

    // Pending
    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(Icons.access_time, color: Colors.amber.shade700, size: 36),
            const SizedBox(width: 12),
            Expanded(child: Text('Booking Under Review — please wait for admin approval', style: TextStyle(color: Colors.amber.shade800, fontWeight: FontWeight.bold))),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(children: [
              Icon(Icons.medical_services, color: AppTheme.primary),
              SizedBox(width: 8),
              Text('Health & Meals Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ]),
            const SizedBox(height: 16),
            TextFormField(
              controller: _medicalController,
              decoration: const InputDecoration(labelText: 'Medical Conditions', hintText: 'e.g. diabetes, asthma'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _dietaryController,
              decoration: const InputDecoration(labelText: 'Dietary Restrictions', hintText: 'e.g. no pork, vegetarian'),
            ),
            const SizedBox(height: 16),
            CustomButton(label: 'Save Health Profile', isLoading: _savingHealth, onPressed: _savingHealth ? null : _saveHealthProfile),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountCard(AuthProvider auth) {
    final user = auth.user;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Account Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text('Reg: ${user?.regNo ?? ''}')),
                Chip(label: Text(user?.email ?? '')),
                Chip(label: Text('Campus: ${user?.campus ?? ''}')),
                Chip(label: Text('Role: ${user?.role ?? ''}')),
                if (user?.course != null && user!.course!.isNotEmpty)
                  Chip(label: Text(user.course!)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWardenCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(children: [
              Icon(Icons.phone, color: AppTheme.primary),
              SizedBox(width: 8),
              Text('Hostel Warden', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ]),
            const SizedBox(height: 12),
            const Text('0714231425', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () => launchUrl(Uri.parse('tel:0714231425')),
              icon: const Icon(Icons.call),
              label: const Text('Call Warden'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            ),
          ],
        ),
      ),
    );
  }
}
