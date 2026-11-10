import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/api_config.dart';
import '../../utils/api_client.dart';

class AdminOperationsScreen extends StatefulWidget {
  const AdminOperationsScreen({super.key});

  @override
  State<AdminOperationsScreen> createState() => _AdminOperationsScreenState();
}

class _AdminOperationsScreenState extends State<AdminOperationsScreen>
    with SingleTickerProviderStateMixin {
  static const _tabs = [
    'Stays',
    'History',
    'Checkout',
    'Periods',
    'Users',
    'Requests',
    'Inspections',
    'Reports',
    'Activity',
  ];

  late final TabController _tabsController;
  final _searchController = TextEditingController();
  late final TextEditingController _fromController;
  late final TextEditingController _toController;
  List<Map<String, dynamic>> _rows = [];
  List<Map<String, dynamic>> _rooms = [];
  List<Map<String, dynamic>> _balances = [];
  Map<String, dynamic>? _report;
  bool _loading = true;
  String? _error;
  String _from = DateTime(
    DateTime.now().year,
    DateTime.now().month,
  ).toIso8601String().substring(0, 10);
  String _to = DateTime.now().toIso8601String().substring(0, 10);

  int get _tab => _tabsController.index;

  @override
  void initState() {
    super.initState();
    _fromController = TextEditingController(text: _from);
    _toController = TextEditingController(text: _to);
    _tabsController = TabController(length: _tabs.length, vsync: this)
      ..addListener(_onTabChanged);
    _load();
  }

  @override
  void dispose() {
    _tabsController
      ..removeListener(_onTabChanged)
      ..dispose();
    _searchController.dispose();
    _fromController.dispose();
    _toController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabsController.indexIsChanging) _load();
  }

  List<Map<String, dynamic>> _asRows(dynamic value) {
    if (value is! List) {
      throw const FormatException('Unexpected server list response');
    }
    return value.map((row) => Map<String, dynamic>.from(row as Map)).toList();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ApiConfig.operations;
      final search = Uri.encodeQueryComponent(_searchController.text.trim());
      if (_tab == 0) {
        final values = await Future.wait([
          ApiClient.get('$api/stays'),
          ApiClient.get('$api/balances'),
        ]);
        _rows = _asRows(values[0]);
        _balances = _asRows(values[1]);
      } else if (_tab == 1) {
        _rows = _asRows(await ApiClient.get('$api/history?search=$search'));
      } else if (_tab == 2) {
        _rows = _asRows(await ApiClient.get('$api/checkout-requests'));
      } else if (_tab == 3) {
        final values = await Future.wait([
          ApiClient.get('$api/periods'),
          ApiClient.get(ApiConfig.rooms),
        ]);
        _rows = _asRows(values[0]);
        _rooms = _asRows(values[1]);
      } else if (_tab == 4) {
        _rows = _asRows(await ApiClient.get('$api/students?search=$search'));
      } else if (_tab == 5) {
        _rows = _asRows(await ApiClient.get('$api/requests'));
      } else if (_tab == 6) {
        final values = await Future.wait([
          ApiClient.get('$api/inspections'),
          ApiClient.get(ApiConfig.rooms),
        ]);
        _rows = _asRows(values[0]);
        _rooms = _asRows(values[1]);
      } else if (_tab == 7) {
        _report = Map<String, dynamic>.from(
          await ApiClient.get('$api/reports?from=$_from&to=$_to'),
        );
        _rows = [];
      } else {
        _rows = _asRows(await ApiClient.get('$api/audit'));
      }
    } catch (error) {
      _error = error.toString().replaceFirst('Exception: ', '');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _mutate(
    Future<dynamic> Function() action, {
    String success = 'Changes saved',
  }) async {
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(success)));
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    }
  }

  String _text(dynamic value, [String fallback = '—']) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty || text == 'null' ? fallback : text;
  }

  String _id(Map<String, dynamic> row) => _text(row['id'] ?? row['_id'], '');

  Map<String, dynamic>? _balanceFor(Map<String, dynamic> stay) {
    for (final balance in _balances) {
      if ('${balance['booking_id']}' == '${stay['id']}') return balance;
    }
    return null;
  }

  Widget _card(
    String title,
    String subtitle, {
    String? details,
    List<Widget> actions = const [],
    Widget? trailing,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(subtitle),
              trailing: trailing,
            ),
            if (details != null && details.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(details),
              ),
            if (actions.isNotEmpty)
              Wrap(spacing: 8, runSpacing: 4, children: actions),
          ],
        ),
      ),
    );
  }

  Widget _buildStay(Map<String, dynamic> row) {
    final balance = _balanceFor(row);
    final due = num.tryParse('${balance?['balance'] ?? 0}') ?? 0;
    final checkedIn = row['checked_in_at'] != null;
    final checkedOut = row['checked_out_at'] != null;
    final id = _id(row);
    final actions = <Widget>[];
    if (!checkedOut && !checkedIn) {
      if ((num.tryParse('${row['confirmed_payments'] ?? 0}') ?? 0) > 0) {
        actions.add(
          OutlinedButton(
            onPressed: () => _mutate(
              () => ApiClient.put('${ApiConfig.operations}/stays/$id/check-in'),
              success: 'Resident checked in',
            ),
            child: const Text('Check in'),
          ),
        );
      }
      if (due > 0) {
        actions.add(
          TextButton(
            onPressed: () => _grantAccess(row, 'mercy'),
            child: const Text('Mercy access'),
          ),
        );
        if ((num.tryParse('${row['confirmed_payments'] ?? 0}') ?? 0) == 0) {
          actions.add(
            TextButton(
              onPressed: () => _grantAccess(row, 'temporary'),
              child: const Text('Temporary access'),
            ),
          );
        }
      }
    }
    if (checkedIn && !checkedOut) {
      actions.add(
        FilledButton.tonal(
          onPressed: () => _mutate(
            () => ApiClient.put('${ApiConfig.operations}/stays/$id/check-out'),
            success: 'Resident checked out',
          ),
          child: const Text('Check out'),
        ),
      );
    }
    if (!checkedOut) {
      actions.add(
        TextButton(
          onPressed: () => _editStayDates(row),
          child: const Text('Edit dates'),
        ),
      );
    }

    return _card(
      _text(row['full_name']),
      '${_text(row['reg_no'])} · ${_text(row['hostel'])} Hostel ${_text(row['room_number'])}'
      '${_text(row['bed_number'], '') == '' ? '' : ' · Bed ${row['bed_number']}'}',
      details:
          'Arrival: ${_text(row['arrival_date'])} · Departure: ${_text(row['departure_date'])}\n'
          'Payment: ${due > 0 ? 'KES ${due.toStringAsFixed(0)} due' : 'Cleared'} · '
          'Stay: ${checkedOut
              ? 'Checked out'
              : checkedIn
              ? 'Checked in'
              : 'Not checked in'}',
      actions: actions,
    );
  }

  Future<void> _grantAccess(Map<String, dynamic> row, String type) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          type == 'mercy' ? 'Grant mercy access' : 'Temporary access',
        ),
        content: TextField(
          controller: controller,
          minLines: 2,
          maxLines: 4,
          maxLength: 500,
          decoration: const InputDecoration(
            labelText: 'Reason (5–500 characters)',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null) return;
    if (reason.length < 5 || reason.length > 500) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Enter a reason between 5 and 500 characters'),
          ),
        );
      }
      return;
    }
    await _mutate(
      () => ApiClient.put(
        '${ApiConfig.operations}/stays/${_id(row)}/temporary-access',
        body: {'reason': reason, 'access_type': type},
      ),
      success: 'Access recorded; outstanding payment remains due',
    );
  }

  Future<void> _editStayDates(Map<String, dynamic> row) async {
    final arrival = TextEditingController(text: _dateOnly(row['arrival_date']));
    final departure = TextEditingController(
      text: _dateOnly(row['departure_date']),
    );
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update stay dates'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: arrival,
              decoration: const InputDecoration(
                labelText: 'Arrival (YYYY-MM-DD)',
              ),
            ),
            TextField(
              controller: departure,
              decoration: const InputDecoration(
                labelText: 'Departure (YYYY-MM-DD)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (save == true) {
      await _mutate(
        () => ApiClient.put(
          '${ApiConfig.operations}/stays/${_id(row)}/dates',
          body: {
            'arrival_date': arrival.text.trim().isEmpty
                ? null
                : arrival.text.trim(),
            'departure_date': departure.text.trim().isEmpty
                ? null
                : departure.text.trim(),
          },
        ),
        success: 'Stay dates updated',
      );
    }
    arrival.dispose();
    departure.dispose();
  }

  String _dateOnly(dynamic value) {
    final text = value?.toString() ?? '';
    return text.length >= 10 ? text.substring(0, 10) : '';
  }

  Future<void> _decideCheckout(
    Map<String, dynamic> row,
    String decision,
  ) async {
    final note = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          decision == 'approved' ? 'Approve checkout?' : 'Decline checkout?',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (decision == 'approved')
              const Text('Confirm fees are cleared and the room is clean.'),
            TextField(
              controller: note,
              decoration: InputDecoration(
                labelText: decision == 'approved'
                    ? 'Note (optional)'
                    : 'Reason',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(decision == 'approved' ? 'Approve' : 'Decline'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _mutate(
        () => ApiClient.patch(
          '${ApiConfig.operations}/checkout-requests/${_id(row)}/decision',
          body: {
            'decision': decision,
            'note': note.text.trim(),
            'clearance_confirmed': decision == 'approved',
          },
        ),
        success: 'Checkout request $decision',
      );
    }
    note.dispose();
  }

  Future<void> _createPeriod() async {
    final campus = TextEditingController(
      text: _rooms.isEmpty ? '' : _rooms.first['campus']?.toString() ?? '',
    );
    final semester = TextEditingController();
    final opensOn = TextEditingController(text: _to);
    String hostel = 'Boys';
    String duration = '3';
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Schedule hostel period'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: campus,
                  decoration: const InputDecoration(labelText: 'Campus'),
                ),
                TextField(
                  controller: semester,
                  decoration: const InputDecoration(
                    labelText: 'Semester / period',
                  ),
                ),
                TextField(
                  controller: opensOn,
                  decoration: const InputDecoration(
                    labelText: 'Opens on (YYYY-MM-DD)',
                  ),
                ),
                DropdownButtonFormField<String>(
                  initialValue: hostel,
                  decoration: const InputDecoration(labelText: 'Hostel'),
                  items: const [
                    DropdownMenuItem(value: 'Boys', child: Text('Boys')),
                    DropdownMenuItem(value: 'Girls', child: Text('Girls')),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => hostel = value ?? hostel),
                ),
                DropdownButtonFormField<String>(
                  initialValue: duration,
                  decoration: const InputDecoration(labelText: 'Duration'),
                  items: List.generate(
                    4,
                    (index) => DropdownMenuItem(
                      value: '${index + 1}',
                      child: Text(
                        '${index + 1} ${index == 0 ? 'month' : 'months'}',
                      ),
                    ),
                  ),
                  onChanged: (value) =>
                      setDialogState(() => duration = value ?? duration),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Schedule'),
            ),
          ],
        ),
      ),
    );
    if (created == true) {
      await _mutate(
        () => ApiClient.post(
          '${ApiConfig.operations}/periods',
          body: {
            'campus': campus.text.trim(),
            'hostel': hostel,
            'semester': semester.text.trim(),
            'opens_on': opensOn.text.trim(),
            'duration_months': int.parse(duration),
          },
        ),
        success: 'Hostel period scheduled',
      );
    }
    campus.dispose();
    semester.dispose();
    opensOn.dispose();
  }

  Future<void> _updateRequest(Map<String, dynamic> row) async {
    final note = TextEditingController(text: _text(row['resolution'], ''));
    String status = _text(row['status'], 'open');
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Update student request'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: status,
                items: const [
                  DropdownMenuItem(value: 'open', child: Text('Open')),
                  DropdownMenuItem(
                    value: 'in_progress',
                    child: Text('In progress'),
                  ),
                  DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                  DropdownMenuItem(value: 'closed', child: Text('Closed')),
                ],
                onChanged: (value) =>
                    setDialogState(() => status = value ?? status),
              ),
              TextField(
                controller: note,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Resolution note'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) {
      await _mutate(
        () => ApiClient.patch(
          '${ApiConfig.operations}/requests/${_id(row)}',
          body: {'status': status, 'resolution': note.text.trim()},
        ),
        success: 'Request updated',
      );
    }
    note.dispose();
  }

  Future<void> _recordInspection() async {
    final notes = TextEditingController();
    String? roomId = _rooms.isEmpty
        ? null
        : _text(_rooms.first['id'] ?? _rooms.first['_id'], '');
    String condition = 'good';
    String cleanliness = 'clean';
    String safety = 'clear';
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Record room inspection'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: roomId,
                  decoration: const InputDecoration(labelText: 'Room'),
                  items: _rooms.map((room) {
                    final id = _text(room['id'] ?? room['_id'], '');
                    return DropdownMenuItem(
                      value: id,
                      child: Text(
                        '${room['hostel']} ${room['room_number']} · ${room['campus']}',
                      ),
                    );
                  }).toList(),
                  onChanged: (value) => setDialogState(() => roomId = value),
                ),
                _choice('Condition', condition, const {
                  'good': 'Good',
                  'attention_required': 'Needs attention',
                  'uninhabitable': 'Uninhabitable',
                }, (value) => setDialogState(() => condition = value)),
                _choice('Cleanliness', cleanliness, const {
                  'clean': 'Clean',
                  'needs_cleaning': 'Needs cleaning',
                  'poor': 'Poor',
                }, (value) => setDialogState(() => cleanliness = value)),
                _choice('Safety', safety, const {
                  'clear': 'Clear',
                  'issue_found': 'Issue found',
                }, (value) => setDialogState(() => safety = value)),
                TextField(
                  controller: notes,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Notes'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: roomId == null
                  ? null
                  : () => Navigator.pop(context, true),
              child: const Text('Save inspection'),
            ),
          ],
        ),
      ),
    );
    if (saved == true && roomId != null) {
      await _mutate(
        () => ApiClient.post(
          '${ApiConfig.operations}/inspections',
          body: {
            'room_id': int.parse(roomId!),
            'condition_status': condition,
            'cleanliness': cleanliness,
            'safety_status': safety,
            'notes': notes.text.trim(),
          },
        ),
        success: 'Inspection recorded',
      );
    }
    notes.dispose();
  }

  Widget _choice(
    String label,
    String value,
    Map<String, String> options,
    ValueChanged<String> onChanged,
  ) => DropdownButtonFormField<String>(
    initialValue: value,
    decoration: InputDecoration(labelText: label),
    items: options.entries
        .map(
          (entry) =>
              DropdownMenuItem(value: entry.key, child: Text(entry.value)),
        )
        .toList(),
    onChanged: (next) {
      if (next != null) onChanged(next);
    },
  );

  List<Widget> _buildRows(int tab) {
    if (tab == 0) return _rows.map(_buildStay).toList();
    if (tab == 2) {
      return _rows.map((row) {
        final pending = row['status'] == 'pending';
        return _card(
          _text(row['full_name']),
          '${_text(row['hostel'])} Hostel ${_text(row['room_number'])} · ${_text(row['semester'])}',
          details:
              'Requested: ${_text(row['requested_at'])}\nReason: ${_text(row['reason'], 'No reason provided')}\n'
              'Status: ${_text(row['status'])}${row['decision_note'] == null ? '' : '\nDecision: ${row['decision_note']}'}',
          actions: pending
              ? [
                  FilledButton.tonal(
                    onPressed: () => _decideCheckout(row, 'approved'),
                    child: const Text('Approve'),
                  ),
                  TextButton(
                    onPressed: () => _decideCheckout(row, 'declined'),
                    child: const Text('Decline'),
                  ),
                ]
              : const [],
        );
      }).toList();
    }
    if (tab == 3) {
      return _rows
          .map(
            (row) => _card(
              _text(row['semester']),
              '${_text(row['campus'])} · ${_text(row['hostel'])} Hostel · ${_text(row['status'])}',
              details:
                  'Opens: ${_text(row['opens_on'])} · Closes: ${_text(row['closes_on'])}\n'
                  'Duration: ${_text(row['duration_months'])} months · Created by ${_text(row['created_by_name'])}',
            ),
          )
          .toList();
    }
    if (tab == 4) {
      return _rows
          .map(
            (row) => _card(
              _text(row['full_name']),
              '${_text(row['reg_no'])} · ${_text(row['email'])} · ${_text(row['role'])}',
              details:
                  'Phone: ${_text(row['phone'])} · Course: ${_text(row['course'])}',
              actions: [
                PopupMenuButton<String>(
                  tooltip: 'Change role',
                  onSelected: (role) => _mutate(
                    () => ApiClient.patch(
                      '${ApiConfig.operations}/students/${_id(row)}/role',
                      body: {'role': role},
                    ),
                    success: 'User role updated',
                  ),
                  itemBuilder: (context) => const [
                    PopupMenuItem(
                      value: 'student',
                      child: Text('Make student'),
                    ),
                    PopupMenuItem(value: 'admin', child: Text('Make admin')),
                  ],
                  child: const Chip(label: Text('Change role')),
                ),
              ],
            ),
          )
          .toList();
    }
    if (tab == 5) {
      return _rows
          .map(
            (row) => _card(
              _text(row['title']),
              '${_text(row['full_name'])} · ${_text(row['request_type'])} · ${_text(row['priority'])}',
              details:
                  '${_text(row['description'])}\nStatus: ${_text(row['status'])}\nResolution: ${_text(row['resolution'], 'No update yet')}',
              actions: [
                OutlinedButton(
                  onPressed: () => _updateRequest(row),
                  child: const Text('Update status'),
                ),
              ],
            ),
          )
          .toList();
    }
    if (tab == 6) {
      return _rows
          .map(
            (row) => _card(
              '${_text(row['hostel'])} Hostel ${_text(row['room_number'])}',
              'Condition: ${_text(row['condition_status'])} · Cleanliness: ${_text(row['cleanliness'])}',
              details:
                  'Safety: ${_text(row['safety_status'])} · Inspected: ${_text(row['inspected_at'] ?? row['created_at'])}\n'
                  'Notes: ${_text(row['notes'], 'None')}',
              actions: [
                TextButton(
                  onPressed: () => _mutate(
                    () => ApiClient.delete(
                      '${ApiConfig.operations}/inspections/${_id(row)}',
                    ),
                    success: 'Inspection deleted',
                  ),
                  child: const Text('Delete inspection'),
                ),
              ],
            ),
          )
          .toList();
    }
    if (tab == 1) {
      return _rows
          .map(
            (row) => _card(
              _text(row['full_name']),
              '${_text(row['reg_no'])} · ${_text(row['hostel'])} Hostel ${_text(row['room_number'])} · ${_text(row['semester'])}',
              details:
                  'Arrival: ${_text(row['arrival_date'])} · Checked in: ${_text(row['checked_in_at'])}\n'
                  'Checked out: ${_text(row['checked_out_at'])} · Payment: ${_text(row['confirmed_payments'], '0')} confirmed',
            ),
          )
          .toList();
    }
    return _rows
        .map(
          (row) => _card(
            _text(row['action']),
            '${_text(row['actor_name'])} · ${_text(row['actor_email'])} · ${_text(row['created_at'])}',
            details:
                '${_text(row['entity_type'])} ${_text(row['entity_id'], '')}\n${_text(row['details'])}',
          ),
        )
        .toList();
  }

  List<Widget> _buildReport() {
    final report = _report;
    if (report == null) return const [];
    final rooms = Map<String, dynamic>.from(report['rooms'] ?? {});
    final payments = Map<String, dynamic>.from(report['payments'] ?? {});
    final bookings = _asRows(report['bookings']);
    final requests = _asRows(report['requests']);
    final balances = _asRows(report['balance_rows']);
    final paymentRows = _asRows(report['payment_rows']);
    final cards = <Widget>[
      _metric('Rooms', '${rooms['rooms'] ?? 0}'),
      _metric('Beds', '${rooms['beds'] ?? 0}'),
      _metric('Occupied beds', '${rooms['occupied'] ?? 0}'),
      _metric('Confirmed income', 'KES ${payments['collected'] ?? 0}'),
      _metric('Pending payments', 'KES ${payments['pending'] ?? 0}'),
      _metric(
        'Outstanding balances',
        'KES ${balances.fold<num>(0, (sum, row) => sum + (num.tryParse('${row['balance']}') ?? 0))}',
      ),
      _metric(
        'Bookings',
        '${bookings.fold<num>(0, (sum, row) => sum + (num.tryParse('${row['total']}') ?? 0))}',
      ),
      _metric(
        'Open requests',
        '${requests.where((row) => ['open', 'in_progress'].contains(row['status'])).fold<num>(0, (sum, row) => sum + (num.tryParse('${row['total']}') ?? 0))}',
      ),
    ];
    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _dateField(
                      'From',
                      _fromController,
                      (value) => _from = value,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _dateField(
                      'To',
                      _toController,
                      (value) => _to = value,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              FilledButton(onPressed: _load, child: const Text('Run report')),
            ],
          ),
        ),
      ),
      ...cards,
      const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'Outstanding balances',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
      ...balances.map(
        (row) => _card(
          _text(row['full_name']),
          '${_text(row['reg_no'])} · ${_text(row['hostel'])} ${_text(row['room_number'])}',
          details:
              'Semester: ${_text(row['semester'])} · Due: KES ${_text(row['amount_due'])} · '
              'Paid: KES ${_text(row['amount_paid'])} · Balance: KES ${_text(row['balance'])}',
        ),
      ),
      const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'Payments',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
      ...paymentRows.map(
        (row) => _card(
          _text(row['full_name']),
          '${_text(row['payment_date'])} · ${_text(row['status'])} · KES ${_text(row['amount'])}',
          details: '${_text(row['reg_no'])} · ${_text(row['mpesa_code'])}',
        ),
      ),
    ];
  }

  Widget _metric(String label, String value) => Card(
    child: ListTile(
      title: Text(label),
      trailing: Text(
        value,
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
    ),
  );

  Widget _dateField(
    String label,
    TextEditingController controller,
    ValueChanged<String> onChanged,
  ) => TextFormField(
    controller: controller,
    decoration: InputDecoration(labelText: label, hintText: 'YYYY-MM-DD'),
    onChanged: onChanged,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hostel operations'),
        actions: [
          IconButton(
            tooltip: 'Finance',
            onPressed: () => context.push('/operations'),
            icon: const Icon(Icons.payments_outlined),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
        bottom: TabBar(
          controller: _tabsController,
          isScrollable: true,
          tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
        ),
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
                      onPressed: _load,
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            )
          : TabBarView(
              controller: _tabsController,
              children: List.generate(_tabs.length, (index) {
                if (index == 7) {
                  return RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(12),
                      children: _buildReport(),
                    ),
                  );
                }
                final widgets = _buildRows(index);
                return RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      if (index == 1 || index == 4)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: TextField(
                            controller: _searchController,
                            textInputAction: TextInputAction.search,
                            onSubmitted: (_) => _load(),
                            decoration: InputDecoration(
                              labelText: index == 1
                                  ? 'Search stay history'
                                  : 'Search users',
                              prefixIcon: const Icon(Icons.search),
                              suffixIcon: IconButton(
                                onPressed: _load,
                                icon: const Icon(Icons.arrow_forward),
                              ),
                            ),
                          ),
                        ),
                      if (index == 3 || index == 6)
                        Align(
                          alignment: Alignment.centerRight,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: FilledButton.icon(
                              onPressed: index == 3
                                  ? _createPeriod
                                  : _recordInspection,
                              icon: const Icon(Icons.add),
                              label: Text(
                                index == 3
                                    ? 'Schedule period'
                                    : 'Record inspection',
                              ),
                            ),
                          ),
                        ),
                      if (widgets.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: Text('No records found')),
                        )
                      else
                        ...widgets,
                    ],
                  ),
                );
              }),
            ),
    );
  }
}
