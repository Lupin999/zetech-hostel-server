import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/room_model.dart';
import '../../utils/helpers.dart';

class RoomCard extends StatelessWidget {
  final Room room;
  final bool hasActiveBooking;
  final VoidCallback onSelectBed;

  const RoomCard({super.key, required this.room, required this.hasActiveBooking, required this.onSelectBed});

  Color get _borderColor {
    switch (room.status?.toLowerCase()) {
      case 'available':
        return Colors.green;
      case 'full':
        return Colors.red;
      case 'maintenance':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final occupied = room.occupiedBeds ?? 0;
    final capacity = room.capacity ?? 4;
    final isAvailable = room.status?.toLowerCase() == 'available';

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: _borderColor, width: 1.5),
      ),
      elevation: 3,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(room.roomNumber ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 6),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: room.hostel?.toLowerCase().contains('girl') == true ? Colors.pink.shade100 : Colors.blue.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(room.hostel ?? '', style: const TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 6),
                Expanded(child: Text(room.roomType ?? '', style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: List.generate(capacity > 6 ? 6 : capacity, (i) => Container(
                width: 14,
                height: 14,
                margin: const EdgeInsets.only(right: 4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < occupied ? Colors.red : Colors.green,
                ),
              )),
            ),
            Text('$occupied of $capacity beds taken', style: const TextStyle(fontSize: 11, color: Colors.grey)),
            const Spacer(),
            Text('KES ${Helpers.formatAmount(room.price ?? 0)}', style: const TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.bold, fontSize: 14)),
            const Text('per semester', style: TextStyle(fontSize: 10, color: Colors.grey)),
            const SizedBox(height: 8),
            if (!hasActiveBooking)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isAvailable ? onSelectBed : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isAvailable ? AppTheme.primary : Colors.grey,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Select Bed', style: TextStyle(fontSize: 12)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
