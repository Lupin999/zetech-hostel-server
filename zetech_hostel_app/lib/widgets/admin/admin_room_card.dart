import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/room_model.dart';
import '../../utils/helpers.dart';
import '../bookings/status_chip.dart';

class AdminRoomCard extends StatelessWidget {
  final Room room;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const AdminRoomCard({super.key, required this.room, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(room.roomNumber ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  Text('${room.hostel ?? ''} • ${room.campus ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 4),
                  Text('${room.roomType ?? ''} • Capacity: ${room.capacity ?? 0}', style: const TextStyle(fontSize: 12)),
                  const SizedBox(height: 4),
                  Text('KES ${Helpers.formatAmount(room.price ?? 0)}', style: const TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Row(children: [
                    StatusChip(status: room.status ?? ''),
                    const SizedBox(width: 8),
                    Text('${room.occupiedBeds ?? 0}/${room.capacity ?? 0} beds', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ]),
                ],
              ),
            ),
            Column(
              children: [
                IconButton(icon: const Icon(Icons.edit, color: AppTheme.primary), onPressed: onEdit),
                IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: onDelete),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
