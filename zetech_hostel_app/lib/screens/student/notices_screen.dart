import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/notice_model.dart';
import '../../utils/api_client.dart';
import '../../utils/helpers.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_spinner.dart';

class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key});

  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  List<Notice> _notices = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchNotices();
  }

  Future<void> _fetchNotices() async {
    setState(() { _loading = true; });
    try {
      // Server returns a flat array of notice objects
      final res = await ApiClient.get(ApiConfig.notices);
      final list = res is List ? res : [];
      setState(() {
        _notices = list
            .map((n) => Notice.fromJson(Map<String, dynamic>.from(n)))
            // Filter out the BOOKING_STATUS sentinel record
            .where((n) => n.title != 'BOOKING_STATUS')
            .toList();
      });
    } catch (_) {}
    setState(() { _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Notices'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchNotices)],
      ),
      body: _loading
          ? const LoadingSpinner()
          : RefreshIndicator(
              onRefresh: _fetchNotices,
              child: _notices.isEmpty
                  ? ListView(children: const [SizedBox(height: 100), EmptyState(icon: Icons.campaign, title: 'No notices yet', subtitle: 'Check back later')])
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // Hero Banner
                        Container(
                          height: 220,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            image: const DecorationImage(image: AssetImage('assets/images/hero.png'), fit: BoxFit.cover),
                          ),
                          child: Container(
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: Colors.black.withOpacity(0.6)),
                            padding: const EdgeInsets.all(24),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Campus Notices', style: TextStyle(color: AppTheme.secondary, fontSize: 22, fontWeight: FontWeight.bold)),
                                SizedBox(height: 8),
                                Text('Stay updated with the latest announcements', style: TextStyle(color: Colors.white70, fontSize: 14)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        ..._notices.map(_buildNoticeCard),
                      ],
                    ),
            ),
    );
  }

  Widget _buildNoticeCard(Notice notice) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: const Border(left: BorderSide(color: AppTheme.primary, width: 4)),
      ),
      child: Card(
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              leading: const Icon(Icons.campaign, color: AppTheme.primary),
              title: Text(notice.title ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
              trailing: Text(Helpers.formatDate(notice.createdAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(notice.message ?? '', style: const TextStyle(color: Colors.grey)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.person, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text('Posted by ${notice.authorName ?? 'Admin'}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
