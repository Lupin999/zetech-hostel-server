import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/notification_model.dart';
import '../../utils/helpers.dart';

class NotificationTile extends StatelessWidget {
  final NotificationModel notification;

  const NotificationTile({super.key, required this.notification});

  @override
  Widget build(BuildContext context) {
    final isRead = notification.isRead == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isRead ? null : AppTheme.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: isRead
            ? null
            : Border.all(color: AppTheme.primary.withOpacity(0.15)),
      ),
      child: ListTile(
        leading: CircleAvatar(
          radius: 18,
          backgroundColor:
              isRead ? Colors.grey.shade200 : AppTheme.primary.withOpacity(0.15),
          child: Icon(
            _iconForType(notification.type),
            size: 18,
            color: isRead ? Colors.grey : AppTheme.primary,
          ),
        ),
        title: Text(
          notification.message ?? '',
          style: TextStyle(
            fontSize: 13,
            fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
          ),
        ),
        subtitle: Text(
          Helpers.formatDate(notification.createdAt),
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
        trailing: isRead
            ? null
            : Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppTheme.primary,
                  shape: BoxShape.circle,
                ),
              ),
      ),
    );
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'payment':
        return Icons.payment;
      case 'booking':
        return Icons.hotel;
      case 'notice':
        return Icons.campaign;
      default:
        return Icons.notifications;
    }
  }
}
