import 'package:flutter/material.dart';
import '../../models/payment_model.dart';
import '../../utils/helpers.dart';
import '../bookings/status_chip.dart';

class AdminPaymentCard extends StatelessWidget {
  final Payment payment;
  final String? studentName;
  final String? regNo;
  final VoidCallback onConfirm;

  const AdminPaymentCard({super.key, required this.payment, this.studentName, this.regNo, required this.onConfirm});

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
                Expanded(child: Text(studentName ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold))),
                StatusChip(status: payment.status ?? ''),
              ],
            ),
            if (regNo != null) Text(regNo!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 8),
            Text('Room ${payment.roomNumber ?? ''} • ${payment.hostel ?? ''}', style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 4),
            Text('KES ${Helpers.formatAmount(payment.amount ?? 0)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: payment.paymentMethod == 'mpesa' ? Colors.green.shade100 : Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(payment.paymentMethod ?? '', style: const TextStyle(fontSize: 11)),
              ),
              if (payment.mpesaCode != null && payment.mpesaCode!.isNotEmpty) ...[
                const SizedBox(width: 8),
                Text(payment.mpesaCode!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ]),
            const SizedBox(height: 4),
            Text('Date: ${Helpers.formatDate(payment.paymentDate)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            if (payment.status?.toLowerCase() == 'pending') ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onConfirm,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  child: const Text('Confirm Payment'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
