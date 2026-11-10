import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../models/payment_model.dart';
import '../../providers/auth_provider.dart';
import '../../utils/api_client.dart';
import '../../utils/helpers.dart';

class AccountOperationsScreen extends StatefulWidget {
  const AccountOperationsScreen({super.key});

  @override
  State<AccountOperationsScreen> createState() =>
      _AccountOperationsScreenState();
}

class _AccountOperationsScreenState extends State<AccountOperationsScreen> {
  List<Map<String, dynamic>> _payments = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPayments();
  }

  Future<void> _loadPayments() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await ApiClient.get(ApiConfig.allPayments);
      if (response is! List) {
        throw const FormatException('Unexpected payment list response');
      }
      final payments = response
          .map((payment) => Map<String, dynamic>.from(payment as Map))
          .toList();
      if (!mounted) return;
      setState(() {
        _payments = payments;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _viewReceipt(Map<String, dynamic> payment) async {
    final id = payment['id'] ?? payment['_id'];
    if (id == null) {
      _showMessage('This payment has no valid ID');
      return;
    }
    try {
      final response = await ApiClient.get(ApiConfig.paymentReceipt(id));
      if (!mounted) return;
      final receipt = Map<String, dynamic>.from(response);
      final amount = Payment.fromJson(receipt).amount;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Payment receipt'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _receiptLine('Receipt', receipt['id']),
              _receiptLine('Student', receipt['full_name']),
              _receiptLine('Registration number', receipt['reg_no']),
              _receiptLine(
                'Amount',
                amount == null ? '—' : 'KES ${Helpers.formatAmount(amount)}',
              ),
              _receiptLine('Payment method', payment['payment_method']),
              _receiptLine('Safaricom receipt', receipt['mpesa_code']),
              _receiptLine('Status', receipt['status']),
              _receiptLine(
                'Date',
                Helpers.formatDate(receipt['payment_date']?.toString()),
              ),
              _receiptLine(
                'Hostel / room',
                '${Helpers.formatHostelName(receipt['hostel']?.toString())} '
                    '${Helpers.formatRoomNumber(receipt['room_number']?.toString())}',
              ),
              _receiptLine('Semester', receipt['semester']),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (!mounted) return;
      _showMessage(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Widget _receiptLine(String label, dynamic value) {
    final text = value?.toString().trim();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text('$label: ${text == null || text.isEmpty ? '—' : text}'),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Finance operations'),
        actions: [
          IconButton(
            tooltip: 'Help',
            onPressed: () => context.push('/help'),
            icon: const Icon(Icons.help_outline),
          ),
          IconButton(
            tooltip: 'Profile',
            onPressed: () => context.go('/profile'),
            icon: const Icon(Icons.person),
          ),
          IconButton(
            tooltip: 'Log out',
            onPressed: () async {
              await auth.logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _loadPayments,
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadPayments,
              child: _payments.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 180),
                        Center(child: Text('No payment records yet.')),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _payments.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final payment = _payments[index];
                        final amount = Payment.fromJson(payment).amount;
                        final status =
                            payment['status']?.toString() ?? 'pending';
                        final room =
                            '${Helpers.formatHostelName(payment['hostel']?.toString())} '
                            '${Helpers.formatRoomNumber(payment['room_number']?.toString())}';
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  payment['full_name']?.toString() ?? 'Student',
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 4),
                                Text('Reg. no.: ${payment['reg_no'] ?? '—'}'),
                                Text(
                                  '$room · ${Helpers.formatDate(payment['payment_date']?.toString())}',
                                ),
                                Text(
                                  '${amount == null ? '—' : 'KES ${Helpers.formatAmount(amount)}'} · '
                                  '${payment['payment_method'] ?? 'M-Pesa'} · '
                                  '${status.toUpperCase()}',
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    if (status == 'pending')
                                      const Text('Awaiting Safaricom verification'),
                                    if (status == 'confirmed')
                                      TextButton(
                                        onPressed: () => _viewReceipt(payment),
                                        child: const Text('View receipt'),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
