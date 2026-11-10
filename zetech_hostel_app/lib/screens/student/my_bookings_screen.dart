import 'dart:async';
import 'package:flutter/material.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../models/payment_model.dart';
import '../../utils/api_client.dart';
import '../../utils/helpers.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_spinner.dart';
import '../../widgets/bookings/booking_card.dart';
import '../../widgets/bookings/payment_status_chip.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<Booking> _bookings = [];
  List<Payment> _payments = [];
  String? _paymentsError;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
    });
    await Future.wait([_fetchBookings(), _fetchPayments()]);
    setState(() {
      _loading = false;
    });
  }

  Future<void> _fetchBookings() async {
    try {
      // Server returns a flat array of booking objects
      final res = await ApiClient.get(ApiConfig.myBookings);
      final list = res is List ? res : [];
      setState(() {
        _bookings = list
            .map((b) => Booking.fromJson(Map<String, dynamic>.from(b)))
            .toList();
      });
    } catch (_) {}
  }

  Future<void> _fetchPayments() async {
    try {
      // Server returns a flat array of payment objects
      final res = await ApiClient.get(ApiConfig.myPayments);
      final list = res is List ? res : [];
      if (!mounted) return;
      setState(() {
        _payments = list
            .map((p) => Payment.fromJson(Map<String, dynamic>.from(p)))
            .toList();
        _paymentsError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _paymentsError = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  int get _totalCount => _bookings.length;
  int get _approvedCount =>
      _bookings.where((b) => b.status == 'approved').length;
  int get _pendingCount => _bookings.where((b) => b.status == 'pending').length;

  void _handleCancel(Booking booking) {
    AwesomeDialog(
      context: context,
      dialogType: DialogType.warning,
      title: 'Cancel Booking',
      desc:
          'Are you sure you want to cancel your booking for Room ${booking.roomNumber}?',
      btnOkText: 'Yes, Cancel',
      btnOkColor: Colors.red,
      btnCancelText: 'No',
      btnOkOnPress: () async {
        try {
          await ApiClient.delete('${ApiConfig.bookings}/${booking.id}');
          Fluttertoast.showToast(
            msg: 'Booking cancelled',
            backgroundColor: Colors.green,
          );
          _loadData();
        } catch (e) {
          AwesomeDialog(
            context: context,
            dialogType: DialogType.error,
            title: 'Error',
            desc: e.toString().replaceFirst('Exception: ', ''),
            btnOkOnPress: () {},
          ).show();
        }
      },
      btnCancelOnPress: () {},
    ).show();
  }

  void _handleMpesaPay(Booking booking) {
    final phoneController = TextEditingController();
    bool sending = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.phone_android, size: 48, color: Colors.green),
                const SizedBox(height: 12),
                const Text(
                  'M-Pesa Payment',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Deposit due now: KES ${Helpers.formatAmount(12000)}',
                  style: const TextStyle(
                    fontSize: 16,
                    color: AppTheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Text(
                  'This deposit is credited toward hostel fees and is non-refundable.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'Phone Number',
                  hint: '07XXXXXXXX',
                  controller: phoneController,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                CustomButton(
                  label: 'Send M-Pesa Request',
                  isLoading: sending,
                  onPressed: sending
                      ? null
                      : () async {
                          if (phoneController.text.trim().isEmpty) return;
                          setSheetState(() {
                            sending = true;
                          });
                          try {
                            await ApiClient.post(
                              ApiConfig.stkPush,
                              body: {
                                'phone': phoneController.text.trim(),
                                'booking_id':
                                    int.tryParse(booking.id ?? '') ??
                                    booking.id,
                              },
                            );
                            Navigator.pop(ctx);
                            AwesomeDialog(
                              context: context,
                              dialogType: DialogType.info,
                              title: 'Check Your Phone',
                              desc:
                                  'Enter your M-Pesa PIN to pay the hostel deposit of KES ${Helpers.formatAmount(12000)}',
                              btnOkOnPress: () {},
                            ).show();
                            _pollPayment(booking.id!);
                          } catch (e) {
                            setSheetState(() {
                              sending = false;
                            });
                            AwesomeDialog(
                              context: context,
                              dialogType: DialogType.error,
                              title: 'Error',
                              desc: e.toString().replaceFirst(
                                'Exception: ',
                                '',
                              ),
                              btnOkOnPress: () {},
                            ).show();
                          }
                        },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _pollPayment(String bookingId) async {
    int elapsed = 0;
    Timer.periodic(const Duration(seconds: 5), (timer) async {
      elapsed += 5;
      if (elapsed >= 120) {
        timer.cancel();
        Fluttertoast.showToast(
          msg: 'Payment not confirmed yet. Check notifications for updates.',
          backgroundColor: Colors.orange,
        );
        return;
      }
      try {
        // Server returns a flat array; field is booking_id (snake_case)
        final res = await ApiClient.get(ApiConfig.myPayments);
        final list = res is List ? res : [];
        final confirmed = list.any(
          (p) =>
              p['booking_id']?.toString() == bookingId &&
              p['status'] == 'confirmed',
        );
        if (confirmed) {
          timer.cancel();
          _loadData();
          AwesomeDialog(
            context: context,
            dialogType: DialogType.success,
            title: 'Payment Confirmed',
            desc: 'Welcome to Zetech Hostel!',
            btnOkOnPress: () {},
          ).show();
        }
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
      ),
      body: _loading
          ? const LoadingSpinner()
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_bookings.isEmpty) ...[
                    const SizedBox(height: 100),
                    const EmptyState(
                      icon: Icons.calendar_today,
                      title: 'No bookings yet',
                      subtitle:
                          'Browse available rooms and make your first booking',
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 48),
                      child: CustomButton(
                        label: 'Browse Rooms',
                        onPressed: () => context.go('/rooms'),
                      ),
                    ),
                  ] else ...[
                    Row(
                      children: [
                        _statCard('Total', _totalCount, Colors.blue),
                        const SizedBox(width: 8),
                        _statCard('Approved', _approvedCount, Colors.green),
                        const SizedBox(width: 8),
                        _statCard('Pending', _pendingCount, Colors.amber),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ..._bookings.map(
                      (b) => BookingCard(
                        booking: b,
                        payments: _payments,
                        onCancel: () => _handleCancel(b),
                        onMpesaPay: () => _handleMpesaPay(b),
                      ),
                    ),
                  ],
                  _buildPaymentHistory(),
                ],
              ),
            ),
    );
  }

  Widget _buildPaymentHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        const Text(
          'Payment history',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (_paymentsError != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Could not load payments: $_paymentsError'),
                  ),
                  IconButton(
                    onPressed: _fetchPayments,
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Retry',
                  ),
                ],
              ),
            ),
          )
        else if (_payments.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No payment records yet.'),
            ),
          )
        else
          ..._payments.map(
            (payment) => Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.payment, color: Colors.blueGrey),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'KES ${Helpers.formatAmount(payment.amount ?? 0)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        PaymentStatusChip(status: payment.status ?? 'pending'),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Room ${Helpers.formatRoomNumber(payment.roomNumber)} · '
                      '${Helpers.formatHostelName(payment.hostel)}',
                    ),
                    Text('Method: ${payment.paymentMethodLabel}'),
                    if (payment.paymentDate != null)
                      Text('Date: ${Helpers.formatDate(payment.paymentDate)}'),
                    if (payment.status == 'confirmed' &&
                        payment.mpesaCode?.isNotEmpty == true)
                      Text('M-Pesa receipt: ${payment.mpesaCode}'),
                  ],
                ),
              ),
            ),
          ),
      ],
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
              Text(
                '$count',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(label, style: TextStyle(fontSize: 12, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
