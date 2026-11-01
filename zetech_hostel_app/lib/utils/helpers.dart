import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class Helpers {
  static String formatHostelName(String? hostel) {
    switch (hostel?.trim().toLowerCase()) {
      case 'boys':
      case 'male':
        return 'Male Hostel';
      case 'girls':
      case 'female':
        return 'Female Hostel';
      default:
        return hostel ?? '—';
    }
  }

  static String formatRoomNumber(String? roomNumber) {
    final value = roomNumber?.trim() ?? '';
    return value.isEmpty || value == '0' || value.toLowerCase() == 'null'
        ? '—'
        : value;
  }

  static String formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('EEEE d MMMM yyyy').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  static String formatAmount(num amount) {
    return NumberFormat('#,##0').format(amount);
  }

  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'confirmed':
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  static String formatPhone(String countryCode, String phone) {
    final cleaned = phone.startsWith('0') ? phone.substring(1) : phone;
    return '$countryCode$cleaned';
  }
}
