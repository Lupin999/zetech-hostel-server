import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/bed_model.dart';

class BedCard extends StatelessWidget {
  final Bed bed;
  final bool isSelected;
  final VoidCallback onTap;

  const BedCard({super.key, required this.bed, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isOccupied = bed.status?.toLowerCase() == 'occupied';

    Color bgColor;
    Color borderColor;
    if (isOccupied) {
      bgColor = Colors.red.shade50;
      borderColor = Colors.red.shade200;
    } else if (isSelected) {
      bgColor = AppTheme.secondary.withOpacity(0.15);
      borderColor = AppTheme.secondary;
    } else {
      bgColor = Colors.green.shade50;
      borderColor = Colors.green.shade200;
    }

    return GestureDetector(
      onTap: isOccupied ? null : onTap,
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: isSelected ? 2.5 : 1.5),
          boxShadow: isSelected ? [BoxShadow(color: AppTheme.secondary.withOpacity(0.3), blurRadius: 8)] : null,
        ),
        padding: const EdgeInsets.all(12),
        child: Opacity(
          opacity: isOccupied ? 0.5 : 1.0,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.king_bed, size: 32, color: isSelected ? AppTheme.secondary : AppTheme.primary),
              const SizedBox(height: 6),
              Text('Bed ${bed.bedNumber}', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: bed.position?.toLowerCase() == 'upper' ? Colors.blue.shade100 : Colors.purple.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(bed.position ?? '', style: const TextStyle(fontSize: 11)),
              ),
              if (isOccupied) ...[
                const SizedBox(height: 4),
                const Text('Taken', style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
