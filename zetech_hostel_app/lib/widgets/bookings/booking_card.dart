import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../models/payment_model.dart';
import '../../utils/helpers.dart';
import 'status_chip.dart';
import 'payment_status_chip.dart';

class BookingCard extends StatelessWidget {
  final Booking booking;
  final List<Payment> payments;
  final VoidCallback onCancel;
  final VoidCallback onMpesaPay;
  final VoidCallback onManualPay;

  const BookingCard({super.key, required this.booking, required this.payments, required this.onCancel, required this.onMpesaPay, required this.onManualPay});

  Payment? get _payment {
    try {
      return payments.firstWhere((p) => p.bookingId == booking.id);
    } catch (_) {
      return null;
    }
  }

  String get _paymentStatus {
    final p = _payment;
    if (p == null) return booking.status == 'approved' ? 'unpaid' : '';
    return p.status ?? 'pending';
  }

  bool get _isPaid => _paymentStatus == 'confirmed';

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: Helpers.getStatusColor(booking.status ?? ''), width: 4)),
      ),
      child: Card(
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 4,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Room ${booking.roomNumber ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                StatusChip(status: booking.status ?? ''),
              ],
            ),
            const SizedBox(height: 8),
            // Hostel chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: booking.hostel?.toLowerCase().contains('girl') == true ? Colors.pink.shade100 : Colors.blue.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(booking.hostel ?? '', style: const TextStyle(fontSize: 12)),
            ),
            const SizedBox(height: 12),
            // Details grid
            _detailRow(Icons.king_bed, 'Bed ${booking.bedNumber ?? ''} (${booking.bedPosition ?? ''})'),
            _detailRow(Icons.school, booking.semester ?? ''),
            _detailRow(Icons.calendar_today, 'Arrival: ${Helpers.formatDate(booking.arrivalDate)}'),
            _detailRow(Icons.access_time, 'Booked: ${Helpers.formatDate(booking.createdAt)}'),
            const SizedBox(height: 8),
            // Payment status
            if (_paymentStatus.isNotEmpty)
              Row(
                children: [
                  const Icon(Icons.payment, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  PaymentStatusChip(status: _paymentStatus),
                ],
              ),
            const SizedBox(height: 12),
            // Action buttons
            Row(
              children: [
                if (booking.status == 'pending')
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onCancel,
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
                      child: const Text('Cancel'),
                    ),
                  ),
                if (booking.status == 'approved' && !_isPaid) ...[
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onMpesaPay,
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                      child: const Text('Pay Now'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onManualPay,
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.secondary),
                      child: const Text('Manual Pay', style: TextStyle(color: Colors.black)),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
