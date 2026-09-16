import 'package:flutter/material.dart';
import '../../models/booking_model.dart';
import '../../utils/helpers.dart';
import '../bookings/status_chip.dart';

class AdminBookingCard extends StatelessWidget {
  final Booking booking;
  final String? studentName;
  final String? regNo;
  final String? paymentStatus;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onSuspend;
  final VoidCallback onUnsuspend;

  const AdminBookingCard({
    super.key,
    required this.booking,
    this.studentName,
    this.regNo,
    this.paymentStatus,
    required this.onApprove,
    required this.onReject,
    required this.onSuspend,
    required this.onUnsuspend,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(studentName ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                StatusChip(status: booking.status ?? ''),
              ],
            ),
            if (regNo != null) Text(regNo!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 8),
            _row(Icons.hotel, 'Room ${booking.roomNumber ?? ''} • Bed ${booking.bedNumber ?? ''}'),
            _row(Icons.location_on, booking.hostel ?? ''),
            _row(Icons.school, booking.semester ?? ''),
            _row(Icons.calendar_today, 'Arrival: ${Helpers.formatDate(booking.arrivalDate)}'),
            _row(Icons.access_time, 'Booked: ${Helpers.formatDate(booking.createdAt)}'),
            if (booking.suspended == true)
              Container(
                margin: const EdgeInsets.only(top: 6),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.red.shade100, borderRadius: BorderRadius.circular(6)),
                child: const Text('SUSPENDED', style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            const SizedBox(height: 10),
            Row(
              children: [
                if (booking.status == 'pending') ...[
                  Expanded(child: ElevatedButton(onPressed: onApprove, style: ElevatedButton.styleFrom(backgroundColor: Colors.green, padding: const EdgeInsets.symmetric(vertical: 8)), child: const Text('Approve', style: TextStyle(fontSize: 12)))),
                  const SizedBox(width: 8),
                  Expanded(child: ElevatedButton(onPressed: onReject, style: ElevatedButton.styleFrom(backgroundColor: Colors.red, padding: const EdgeInsets.symmetric(vertical: 8)), child: const Text('Reject', style: TextStyle(fontSize: 12)))),
                ],
                if (booking.status == 'approved') ...[
                  if (booking.suspended != true)
                    Expanded(child: ElevatedButton(onPressed: onSuspend, style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, padding: const EdgeInsets.symmetric(vertical: 8)), child: const Text('Suspend', style: TextStyle(fontSize: 12))))
                  else
                    Expanded(child: ElevatedButton(onPressed: onUnsuspend, style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, padding: const EdgeInsets.symmetric(vertical: 8)), child: const Text('Unsuspend', style: TextStyle(fontSize: 12)))),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(children: [Icon(icon, size: 14, color: Colors.grey), const SizedBox(width: 6), Expanded(child: Text(text, style: const TextStyle(fontSize: 12)))]),
    );
  }
}
