import 'package:flutter/material.dart';

class PaymentStatusChip extends StatelessWidget {
  final String status;

  const PaymentStatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status.toLowerCase()) {
      case 'confirmed':
        color = Colors.green;
        label = 'PAID';
        break;
      case 'pending':
        color = Colors.amber;
        label = 'PENDING';
        break;
      default:
        color = Colors.orange;
        label = 'UNPAID';
    }
    return Chip(
      label: Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
      backgroundColor: color,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
