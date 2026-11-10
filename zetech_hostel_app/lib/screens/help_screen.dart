import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_theme.dart';
import '../providers/auth_provider.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final role = context.watch<AuthProvider>().user?.role?.toLowerCase();
    return Scaffold(
      appBar: AppBar(title: const Text('Hostel app guide')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: AppTheme.primary.withValues(alpha: 0.08),
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Start here: choose a room, submit a booking, wait for approval, '
                'then pay the KES 12,000 deposit using the M-Pesa prompt.',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 8),
          _GuideSection(
            title: 'Student journey',
            icon: Icons.school_outlined,
            content:
                '1. Register with your Zetech admission number, selected programme, email and phone number. '
                'Example admission number: BSE-01\'0046/2024.\n'
                '2. Browse available rooms and submit a booking for a valid arrival date.\n'
                '3. Wait for an admin to approve the booking.\n'
                '4. Pay the KES 12,000 deposit through the M-Pesa STK prompt. The remaining room fee is separate.\n'
                '5. Present yourself for staff check-in. After check-in, use Services to request checkout when leaving; '
                'an admin must approve it before the bed is released.',
          ),
          _GuideSection(
            title: 'What each role does',
            icon: Icons.groups_outlined,
            content:
                'Student: manages their profile, bookings, M-Pesa payments, notices, services and checkout requests.\n\n'
                'Admin: manages users, rooms, bookings, check-in and checkout, inspections, requests, notices, payments and reports. '
                'M-Pesa payments are confirmed by Safaricom, not by typing a transaction code.',
          ),
          _GuideSection(
            title: 'Payments and receipts',
            icon: Icons.payments_outlined,
            content:
                'The booking deposit is KES 12,000. Use the phone number registered on your account to receive the '
                'M-Pesa prompt. A payment is valid only after Safaricom confirms it; a manually entered transaction '
                'code is not accepted. The deposit is non-refundable and is credited toward fees.',
          ),
          _GuideSection(
            title: 'Periods, dates and checkout',
            icon: Icons.calendar_month_outlined,
            content:
                'A hostel period defines when bookings are open and the stay period linked to them. Arrival dates must '
                'be real calendar dates and cannot be in the past. Students can request checkout only after admin check-in; '
                'the request is complete when an admin approves it. Closing a period may automatically end active stays '
                'and cancel bookings that were never checked in.',
          ),
          _GuideSection(
            title: 'Admission verification',
            icon: Icons.info_outline,
            content:
                'The app checks the admission-number format and that its programme code matches the selected programme. '
                'It does not currently connect to the university student registry, so it cannot independently verify '
                'enrolment.',
          ),
          if (role != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Signed in as: ${role[0].toUpperCase()}${role.substring(1)}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.black54),
              ),
            ),
        ],
      ),
    );
  }
}

class _GuideSection extends StatelessWidget {
  const _GuideSection({
    required this.title,
    required this.icon,
    required this.content,
  });

  final String title;
  final IconData icon;
  final String content;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(top: 8),
      child: ExpansionTile(
        leading: Icon(icon, color: AppTheme.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: [Text(content)],
      ),
    );
  }
}
