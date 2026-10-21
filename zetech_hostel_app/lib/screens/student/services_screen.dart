import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../config/api_config.dart';
import '../../utils/api_client.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final _requestTitle = TextEditingController();
  final _requestDetails = TextEditingController();
  final _visitorName = TextEditingController();
  final _visitorPhone = TextEditingController();
  final _visitorPurpose = TextEditingController();
  List<Map<String, dynamic>> _requests = [];
  List<Map<String, dynamic>> _visitors = [];
  List<Map<String, dynamic>> _payments = [];
  String _requestType = 'maintenance';
  String _priority = 'normal';
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _requestTitle.dispose();
    _requestDetails.dispose();
    _visitorName.dispose();
    _visitorPhone.dispose();
    _visitorPurpose.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _asList(dynamic value) => value is List
      ? value.map((row) => Map<String, dynamic>.from(row as Map)).toList()
      : [];

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        ApiClient.get('${ApiConfig.operations}/requests'),
        ApiClient.get('${ApiConfig.operations}/visitors'),
        ApiClient.get(ApiConfig.myPayments),
      ]);
      if (!mounted) return;
      setState(() {
        _requests = _asList(results[0]);
        _visitors = _asList(results[1]);
        _payments = _asList(results[2]);
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      Fluttertoast.showToast(
        msg: error.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  Future<void> _submit(
    String path,
    Map<String, dynamic> body,
    VoidCallback clear,
  ) async {
    setState(() => _submitting = true);
    try {
      await ApiClient.post('${ApiConfig.operations}/$path', body: body);
      clear();
      await _loadData();
      Fluttertoast.showToast(msg: 'Submitted successfully');
    } catch (error) {
      Fluttertoast.showToast(
        msg: error.toString().replaceFirst('Exception: ', ''),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _empty(String text) => Padding(
    padding: const EdgeInsets.all(24),
    child: Center(
      child: Text(text, style: const TextStyle(color: Colors.grey)),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Student Services'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Requests'),
              Tab(text: 'Visitors'),
              Tab(text: 'Payments'),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [_requestTab(), _visitorTab(), _paymentTab()],
              ),
      ),
    );
  }

  Widget _requestTab() => RefreshIndicator(
    onRefresh: _loadData,
    child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _requestTitle,
          decoration: const InputDecoration(labelText: 'Subject'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _requestType,
          decoration: const InputDecoration(labelText: 'Type'),
          items: const [
            DropdownMenuItem(value: 'maintenance', child: Text('Maintenance')),
            DropdownMenuItem(value: 'complaint', child: Text('Complaint')),
          ],
          onChanged: (value) =>
              setState(() => _requestType = value ?? 'maintenance'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _priority,
          decoration: const InputDecoration(labelText: 'Priority'),
          items: ['low', 'normal', 'high', 'urgent']
              .map(
                (value) => DropdownMenuItem(value: value, child: Text(value)),
              )
              .toList(),
          onChanged: (value) => setState(() => _priority = value ?? 'normal'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _requestDetails,
          minLines: 2,
          maxLines: 5,
          decoration: const InputDecoration(labelText: 'Details'),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _submitting
              ? null
              : () => _submit(
                  'requests',
                  {
                    'request_type': _requestType,
                    'priority': _priority,
                    'title': _requestTitle.text.trim(),
                    'description': _requestDetails.text.trim(),
                  },
                  () {
                    _requestTitle.clear();
                    _requestDetails.clear();
                  },
                ),
          child: const Text('Submit request'),
        ),
        const Divider(height: 32),
        if (_requests.isEmpty)
          _empty('No requests yet')
        else
          ..._requests.map(
            (request) => Card(
              child: ListTile(
                title: Text(request['title']?.toString() ?? ''),
                subtitle: Text(
                  '${request['request_type']} · ${request['priority']}\n'
                  '${request['description']}\nStatus: ${request['status']}\n'
                  '${request['resolution'] ?? 'No update yet'}',
                ),
                isThreeLine: true,
              ),
            ),
          ),
      ],
    ),
  );

  Widget _visitorTab() => RefreshIndicator(
    onRefresh: _loadData,
    child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Register expected visitors. Staff record arrivals at the gate.',
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _visitorName,
          decoration: const InputDecoration(labelText: 'Visitor name'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _visitorPhone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Phone (optional)'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _visitorPurpose,
          decoration: const InputDecoration(labelText: 'Purpose'),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _submitting
              ? null
              : () => _submit(
                  'visitors',
                  {
                    'visitor_name': _visitorName.text.trim(),
                    'visitor_phone': _visitorPhone.text.trim(),
                    'purpose': _visitorPurpose.text.trim(),
                  },
                  () {
                    _visitorName.clear();
                    _visitorPhone.clear();
                    _visitorPurpose.clear();
                  },
                ),
          child: const Text('Register visitor'),
        ),
        const Divider(height: 32),
        if (_visitors.isEmpty)
          _empty('No visitors registered')
        else
          ..._visitors.map(
            (visitor) => Card(
              child: ListTile(
                title: Text(visitor['visitor_name']?.toString() ?? ''),
                subtitle: Text(
                  '${visitor['purpose']}\nStatus: ${visitor['status']}\n'
                  '${visitor['arrival_at'] ?? 'Expected'}',
                ),
              ),
            ),
          ),
      ],
    ),
  );

  Widget _paymentTab() => RefreshIndicator(
    onRefresh: _loadData,
    child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Payments'),
        if (_payments.isEmpty)
          _empty('No payments found')
        else
          ..._payments.map(
            (payment) => Card(
              child: ListTile(
                title: Text('KES ${payment['amount']} · ${payment['status']}'),
                subtitle: Text(
                  'Room ${payment['room_number']} · ${payment['payment_method'] == 'legacy_manual' ? 'Legacy manual (historical)' : 'M-Pesa'}\n'
                  'Reference: ${payment['mpesa_code'] ?? '—'} · ${payment['payment_date']}',
                ),
              ),
            ),
          ),
      ],
    ),
  );
}
