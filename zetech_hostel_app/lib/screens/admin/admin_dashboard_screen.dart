import 'package:flutter/material.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../models/notice_model.dart';
import '../../models/payment_model.dart';
import '../../models/room_model.dart';
import '../../providers/auth_provider.dart';
import '../../utils/api_client.dart';
import '../../utils/helpers.dart';
import '../../widgets/admin/admin_booking_card.dart';
import '../../widgets/admin/admin_payment_card.dart';
import '../../widgets/admin/admin_room_card.dart';
import '../../widgets/admin/stat_card.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';
import '../../widgets/common/loading_spinner.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  List<Map<String, dynamic>> _bookingsRaw = [];
  List<Map<String, dynamic>> _filteredBookings = [];
  List<Room> _rooms = [];
  List<Room> _filteredRooms = [];
  List<Map<String, dynamic>> _paymentsRaw = [];
  List<Map<String, dynamic>> _filteredPayments = [];
  List<Notice> _notices = [];
  bool _loading = true;

  String _bookingSearch = '';
  String _bookingStatusFilter = 'All';
  String _roomSearch = '';
  String _paymentSearch = '';
  String _paymentStatusFilter = 'All';

  final _noticeTitleController = TextEditingController();
  final _noticeMessageController = TextEditingController();
  bool _postingNotice = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _noticeTitleController.dispose();
    _noticeMessageController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; });
    await Future.wait([_fetchBookings(), _fetchRooms(), _fetchPayments(), _fetchNotices()]);
    setState(() { _loading = false; });
  }

  Future<void> _fetchBookings() async {
    try {
      // Server returns a flat array
      final res = await ApiClient.get(ApiConfig.allBookings);
      final list = res is List ? res : [];
      setState(() {
        _bookingsRaw = List<Map<String, dynamic>>.from(list);
        _filterBookings();
      });
    } catch (_) {}
  }

  Future<void> _fetchRooms() async {
    try {
      // Server returns a flat array
      final res = await ApiClient.get(ApiConfig.rooms);
      final list = res is List ? res : [];
      setState(() {
        _rooms = list.map((r) => Room.fromJson(Map<String, dynamic>.from(r))).toList();
        _filterRooms();
      });
    } catch (_) {}
  }

  Future<void> _fetchPayments() async {
    try {
      // Server returns a flat array
      final res = await ApiClient.get(ApiConfig.allPayments);
      final list = res is List ? res : [];
      setState(() {
        _paymentsRaw = List<Map<String, dynamic>>.from(list);
        _filterPayments();
      });
    } catch (_) {}
  }

  Future<void> _fetchNotices() async {
    try {
      // Server returns a flat array; filter the BOOKING_STATUS sentinel
      final res = await ApiClient.get(ApiConfig.notices);
      final list = res is List ? res : [];
      setState(() {
        _notices = list
            .map((n) => Notice.fromJson(Map<String, dynamic>.from(n)))
            .where((n) => n.title != 'BOOKING_STATUS')
            .toList();
      });
    } catch (_) {}
  }

  void _filterBookings() {
    setState(() {
      _filteredBookings = _bookingsRaw.where((b) {
        // Server returns full_name and reg_no (snake_case)
        final name = (b['full_name'] ?? b['studentName'] ?? '').toString().toLowerCase();
        final reg = (b['reg_no'] ?? b['regNo'] ?? '').toString().toLowerCase();
        final status = (b['status'] ?? '').toString().toLowerCase();
        final matchSearch = _bookingSearch.isEmpty ||
            name.contains(_bookingSearch.toLowerCase()) ||
            reg.contains(_bookingSearch.toLowerCase());
        final matchStatus = _bookingStatusFilter == 'All' ||
            status == _bookingStatusFilter.toLowerCase();
        return matchSearch && matchStatus;
      }).toList();
    });
  }

  void _filterRooms() {
    setState(() {
      _filteredRooms = _rooms.where((r) {
        final matchSearch = _roomSearch.isEmpty ||
            (r.roomNumber?.toLowerCase().contains(_roomSearch.toLowerCase()) ?? false) ||
            (r.campus?.toLowerCase().contains(_roomSearch.toLowerCase()) ?? false);
        return matchSearch;
      }).toList();
    });
  }

  void _filterPayments() {
    setState(() {
      _filteredPayments = _paymentsRaw.where((p) {
        // Server returns full_name and reg_no (snake_case)
        final name = (p['full_name'] ?? p['studentName'] ?? '').toString().toLowerCase();
        final reg = (p['reg_no'] ?? p['regNo'] ?? '').toString().toLowerCase();
        final status = (p['status'] ?? '').toString().toLowerCase();
        final matchSearch = _paymentSearch.isEmpty ||
            name.contains(_paymentSearch.toLowerCase()) ||
            reg.contains(_paymentSearch.toLowerCase());
        final matchStatus = _paymentStatusFilter == 'All' ||
            status == _paymentStatusFilter.toLowerCase();
        return matchSearch && matchStatus;
      }).toList();
    });
  }

  // Stats
  int get _bedsTaken => _bookingsRaw.where((b) => b['status'] == 'approved').length;
  int get _pendingCount => _bookingsRaw.where((b) => b['status'] == 'pending').length;
  int get _approvedCount => _bookingsRaw.where((b) => b['status'] == 'approved').length;
  int get _rejectedCount => _bookingsRaw.where((b) => b['status'] == 'rejected').length;
  int get _cancelledCount => _bookingsRaw.where((b) => b['status'] == 'cancelled').length;

  // Actions
  void _approveBooking(Map<String, dynamic> b) {
    AwesomeDialog(
      context: context, dialogType: DialogType.question,
      title: 'Approve Booking', desc: 'Approve booking for Room ${b['roomNumber']}?',
      btnOkText: 'Approve', btnCancelText: 'Cancel',
      btnOkOnPress: () async {
        try {
          await ApiClient.put('${ApiConfig.bookings}/${b['_id'] ?? b['id']}/status', body: {'status': 'approved'});
          Fluttertoast.showToast(msg: 'Booking approved', backgroundColor: Colors.green);
          _fetchBookings();
        } catch (e) { _showError(e); }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _rejectBooking(Map<String, dynamic> b) {
    final reasonController = TextEditingController();
    AwesomeDialog(
      context: context, dialogType: DialogType.warning,
      title: 'Reject Booking', desc: 'Provide a reason for rejection:',
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: TextField(controller: reasonController, decoration: const InputDecoration(hintText: 'Reason...')),
      ),
      btnOkText: 'Reject', btnOkColor: Colors.red, btnCancelText: 'Cancel',
      btnOkOnPress: () async {
        try {
          await ApiClient.put('${ApiConfig.bookings}/${b['_id'] ?? b['id']}/status', body: {'status': 'rejected', 'reason': reasonController.text});
          Fluttertoast.showToast(msg: 'Booking rejected', backgroundColor: Colors.red);
          _fetchBookings();
        } catch (e) { _showError(e); }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _suspendBooking(Map<String, dynamic> b) {
    final reasonController = TextEditingController();
    AwesomeDialog(
      context: context, dialogType: DialogType.warning,
      title: 'Suspend Booking',
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: TextField(controller: reasonController, decoration: const InputDecoration(hintText: 'Reason (optional)...')),
      ),
      btnOkText: 'Suspend', btnOkColor: Colors.amber, btnCancelText: 'Cancel',
      btnOkOnPress: () async {
        try {
          await ApiClient.put('${ApiConfig.bookings}/${b['_id'] ?? b['id']}/suspend', body: {'suspended': true, 'reason': reasonController.text});
          Fluttertoast.showToast(msg: 'Booking suspended', backgroundColor: Colors.amber);
          _fetchBookings();
        } catch (e) { _showError(e); }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _unsuspendBooking(Map<String, dynamic> b) async {
    try {
      await ApiClient.put('${ApiConfig.bookings}/${b['_id'] ?? b['id']}/suspend', body: {'suspended': false});
      Fluttertoast.showToast(msg: 'Booking unsuspended', backgroundColor: Colors.blue);
      _fetchBookings();
    } catch (e) { _showError(e); }
  }

  void _deleteRoom(Room room) {
    AwesomeDialog(
      context: context, dialogType: DialogType.warning,
      title: 'Delete Room', desc: 'Delete room ${room.roomNumber}?',
      btnOkText: 'Delete', btnOkColor: Colors.red, btnCancelText: 'Cancel',
      btnOkOnPress: () async {
        try {
          await ApiClient.delete('${ApiConfig.rooms}${room.id}');
          Fluttertoast.showToast(msg: 'Room deleted', backgroundColor: Colors.green);
          _fetchRooms();
        } catch (e) {
          AwesomeDialog(context: context, dialogType: DialogType.error, title: 'Error', desc: e.toString().contains('active') ? 'Cannot delete room with active bookings' : e.toString().replaceFirst('Exception: ', ''), btnOkOnPress: () {}).show();
        }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _showRoomForm({Room? room}) {
    final numController = TextEditingController(text: room?.roomNumber ?? '');
    final campusController = TextEditingController(text: room?.campus ?? '');
    final capacityController = TextEditingController(text: room?.capacity?.toString() ?? '4');
    final priceController = TextEditingController(text: room?.price?.toString() ?? '30000');
    String hostel = room?.hostel ?? 'Boys';
    String roomType = room?.roomType ?? 'quad';
    String status = room?.status ?? 'available';
    bool submitting = false;

    showModalBottomSheet(
      context: context, isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return Padding(
          padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(room == null ? 'Add Room' : 'Edit Room', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                CustomTextField(label: 'Room Number', controller: numController),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(value: hostel, decoration: const InputDecoration(labelText: 'Hostel'), items: ['Boys', 'Girls'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(), onChanged: (v) => hostel = v!),
                const SizedBox(height: 12),
                CustomTextField(label: 'Campus', controller: campusController),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(value: roomType, decoration: const InputDecoration(labelText: 'Room Type'), items: ['single', 'double', 'quad'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(), onChanged: (v) => roomType = v!),
                const SizedBox(height: 12),
                CustomTextField(label: 'Capacity', controller: capacityController, keyboardType: TextInputType.number),
                const SizedBox(height: 12),
                CustomTextField(label: 'Price', controller: priceController, keyboardType: TextInputType.number),
                if (room != null) ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(value: status, decoration: const InputDecoration(labelText: 'Status'), items: ['available', 'occupied', 'maintenance'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(), onChanged: (v) => status = v!),
                ],
                const SizedBox(height: 16),
                CustomButton(
                  label: room == null ? 'Add Room' : 'Update Room',
                  isLoading: submitting,
                  onPressed: submitting ? null : () async {
                    setSheetState(() { submitting = true; });
                    final body = {
                      // Server expects snake_case keys
                      'room_number': numController.text.trim(),
                      'hostel': hostel,
                      'campus': campusController.text.trim(),
                      'room_type': roomType,
                      'capacity': int.tryParse(capacityController.text) ?? 4,
                      'price': double.tryParse(priceController.text) ?? 30000,
                      'status': status,
                    };
                    try {
                      if (room == null) {
                        await ApiClient.post(ApiConfig.rooms, body: body);
                      } else {
                        await ApiClient.put('${ApiConfig.rooms}${room.id}', body: body);
                      }
                      Navigator.pop(ctx);
                      Fluttertoast.showToast(msg: room == null ? 'Room added' : 'Room updated', backgroundColor: Colors.green);
                      _fetchRooms();
                    } catch (e) {
                      setSheetState(() { submitting = false; });
                      AwesomeDialog(context: context, dialogType: DialogType.error, title: 'Error', desc: e.toString().replaceFirst('Exception: ', ''), btnOkOnPress: () {}).show();
                    }
                  },
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  void _confirmPayment(Map<String, dynamic> p) {
    AwesomeDialog(
      context: context, dialogType: DialogType.question,
      title: 'Confirm Payment', desc: 'Confirm payment of KES ${Helpers.formatAmount(p['amount'] ?? 0)}?',
      btnOkText: 'Confirm', btnCancelText: 'Cancel',
      btnOkOnPress: () async {
        try {
          await ApiClient.patch(ApiConfig.confirmPayment(p['_id'] ?? p['id']));
          Fluttertoast.showToast(msg: 'Payment confirmed', backgroundColor: Colors.green);
          _fetchPayments();
        } catch (e) { _showError(e); }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  Future<void> _postNotice() async {
    if (_noticeTitleController.text.trim().isEmpty || _noticeMessageController.text.trim().isEmpty) return;
    setState(() { _postingNotice = true; });
    try {
      final auth = context.read<AuthProvider>();
      await ApiClient.post(ApiConfig.notices, body: {
        'title': _noticeTitleController.text.trim(),
        'message': _noticeMessageController.text.trim(),
        'createdBy': auth.user?.id,
      });
      _noticeTitleController.clear();
      _noticeMessageController.clear();
      Fluttertoast.showToast(msg: 'Notice posted', backgroundColor: Colors.green);
      _fetchNotices();
    } catch (e) { _showError(e); }
    setState(() { _postingNotice = false; });
  }

  void _deleteNotice(Notice notice) {
    AwesomeDialog(
      context: context, dialogType: DialogType.warning,
      title: 'Delete Notice', desc: 'Delete "${notice.title}"?',
      btnOkText: 'Delete', btnOkColor: Colors.red, btnCancelText: 'Cancel',
      btnOkOnPress: () async {
        try {
          await ApiClient.delete('${ApiConfig.notices}/${notice.id}');
          Fluttertoast.showToast(msg: 'Notice deleted', backgroundColor: Colors.green);
          _fetchNotices();
        } catch (e) { _showError(e); }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _showError(Object e) {
    AwesomeDialog(context: context, dialogType: DialogType.error, title: 'Error', desc: e.toString().replaceFirst('Exception: ', ''), btnOkOnPress: () {}).show();
  }

  void _showLogoutDialog() {
    final auth = context.read<AuthProvider>();
    AwesomeDialog(
      context: context, dialogType: DialogType.info,
      title: 'Logout', desc: 'Are you sure you want to logout?',
      btnOkText: 'Logout', btnCancelText: 'Stay',
      btnOkOnPress: () async { await auth.logout(); if (mounted) context.go('/login'); },
      btnCancelOnPress: () {},
    ).show();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Admin Dashboard'),
          actions: [IconButton(icon: const Icon(Icons.logout), onPressed: _showLogoutDialog)],
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(icon: Icon(Icons.people), text: 'Bookings'),
              Tab(icon: Icon(Icons.hotel), text: 'Rooms'),
              Tab(icon: Icon(Icons.campaign), text: 'Notices'),
              Tab(icon: Icon(Icons.payment), text: 'Payments'),
            ],
          ),
        ),
        floatingActionButton: Builder(builder: (ctx) {
          return FloatingActionButton(
            backgroundColor: AppTheme.primary,
            child: const Icon(Icons.add),
            onPressed: () => _showRoomForm(),
          );
        }),
        body: _loading
            ? const LoadingSpinner()
            : Column(
                children: [
                  // Stats + Chart
                  SizedBox(
                    height: 120,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.all(12),
                      children: [
                        StatCard(icon: Icons.hotel, label: 'Total Rooms', value: '${_rooms.length}', backgroundColor: AppTheme.primary),
                        StatCard(icon: Icons.king_bed, label: 'Total Beds', value: '48', backgroundColor: Colors.purple),
                        StatCard(icon: Icons.people, label: 'Beds Taken', value: '$_bedsTaken', backgroundColor: Colors.red),
                        StatCard(icon: Icons.check_circle, label: 'Beds Free', value: '${48 - _bedsTaken}', backgroundColor: Colors.green),
                      ],
                    ),
                  ),
                  // Pie Chart
                  if (_bookingsRaw.isNotEmpty)
                    SizedBox(
                      height: 140,
                      child: Row(
                        children: [
                          Expanded(
                            child: PieChart(PieChartData(
                              sectionsSpace: 2,
                              centerSpaceRadius: 24,
                              sections: [
                                if (_pendingCount > 0) PieChartSectionData(value: _pendingCount.toDouble(), color: Colors.orange, title: '$_pendingCount', radius: 30, titleStyle: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                                if (_approvedCount > 0) PieChartSectionData(value: _approvedCount.toDouble(), color: Colors.green, title: '$_approvedCount', radius: 30, titleStyle: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                                if (_rejectedCount > 0) PieChartSectionData(value: _rejectedCount.toDouble(), color: Colors.red, title: '$_rejectedCount', radius: 30, titleStyle: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                                if (_cancelledCount > 0) PieChartSectionData(value: _cancelledCount.toDouble(), color: Colors.grey, title: '$_cancelledCount', radius: 30, titleStyle: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                              ],
                            )),
                          ),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _legend(Colors.orange, 'Pending'),
                              _legend(Colors.green, 'Approved'),
                              _legend(Colors.red, 'Rejected'),
                              _legend(Colors.grey, 'Cancelled'),
                            ],
                          ),
                          const SizedBox(width: 16),
                        ],
                      ),
                    ),
                  // Tabs
                  Expanded(
                    child: TabBarView(
                      children: [_bookingsTab(), _roomsTab(), _noticesTab(), _paymentsTab()],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _legend(Color color, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)), const SizedBox(width: 6), Text(label, style: const TextStyle(fontSize: 11))]),
    );
  }

  Widget _bookingsTab() {
    return RefreshIndicator(
      onRefresh: _fetchBookings,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Row(
              children: [
                Expanded(child: TextField(decoration: const InputDecoration(hintText: 'Search...', prefixIcon: Icon(Icons.search), isDense: true), onChanged: (v) { _bookingSearch = v; _filterBookings(); })),
                const SizedBox(width: 8),
                DropdownButton<String>(value: _bookingStatusFilter, items: ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13)))).toList(), onChanged: (v) { _bookingStatusFilter = v!; _filterBookings(); }),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _filteredBookings.length,
              itemBuilder: (_, i) {
                final b = _filteredBookings[i];
                return AdminBookingCard(
                  booking: Booking.fromJson(b),
                  studentName: b['full_name'] ?? b['studentName'],
                  regNo: b['reg_no'] ?? b['regNo'],
                  onApprove: () => _approveBooking(b),
                  onReject: () => _rejectBooking(b),
                  onSuspend: () => _suspendBooking(b),
                  onUnsuspend: () => _unsuspendBooking(b),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _roomsTab() {
    return RefreshIndicator(
      onRefresh: _fetchRooms,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: TextField(decoration: const InputDecoration(hintText: 'Search rooms...', prefixIcon: Icon(Icons.search), isDense: true), onChanged: (v) { _roomSearch = v; _filterRooms(); }),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _filteredRooms.length,
              itemBuilder: (_, i) => AdminRoomCard(
                room: _filteredRooms[i],
                onEdit: () => _showRoomForm(room: _filteredRooms[i]),
                onDelete: () => _deleteRoom(_filteredRooms[i]),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _noticesTab() {
    return RefreshIndicator(
      onRefresh: _fetchNotices,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text('Post New Notice', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  CustomTextField(label: 'Title', controller: _noticeTitleController),
                  const SizedBox(height: 12),
                  TextField(controller: _noticeMessageController, maxLines: 4, decoration: const InputDecoration(labelText: 'Message', border: OutlineInputBorder())),
                  const SizedBox(height: 12),
                  CustomButton(label: 'Post Notice', isLoading: _postingNotice, onPressed: _postingNotice ? null : _postNotice),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          ..._notices.map((n) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(n.title ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n.message ?? ''),
                  const SizedBox(height: 4),
                  Text('${Helpers.formatDate(n.createdAt)} • ${n.authorName ?? 'Admin'}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
              trailing: IconButton(icon: const Icon(Icons.delete, color: Colors.red, size: 20), onPressed: () => _deleteNotice(n)),
            ),
          )),
        ],
      ),
    );
  }

  Widget _paymentsTab() {
    return RefreshIndicator(
      onRefresh: _fetchPayments,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Row(
              children: [
                Expanded(child: TextField(decoration: const InputDecoration(hintText: 'Search...', prefixIcon: Icon(Icons.search), isDense: true), onChanged: (v) { _paymentSearch = v; _filterPayments(); })),
                const SizedBox(width: 8),
                DropdownButton<String>(value: _paymentStatusFilter, items: ['All', 'Pending', 'Confirmed'].map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13)))).toList(), onChanged: (v) { _paymentStatusFilter = v!; _filterPayments(); }),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _filteredPayments.length,
              itemBuilder: (_, i) {
                final p = _filteredPayments[i];
                return AdminPaymentCard(
                  payment: Payment.fromJson(p),
                  studentName: p['full_name'] ?? p['studentName'],
                  regNo: p['reg_no'] ?? p['regNo'],
                  onConfirm: () => _confirmPayment(p),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
