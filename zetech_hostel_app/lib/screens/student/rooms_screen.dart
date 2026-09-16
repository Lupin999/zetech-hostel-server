import 'package:flutter/material.dart';
import 'package:awesome_dialog/awesome_dialog.dart';
import 'package:go_router/go_router.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../models/bed_model.dart';
import '../../models/booking_model.dart';
import '../../models/room_model.dart';
import '../../utils/api_client.dart';
import '../../utils/constants.dart';
import '../../utils/helpers.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/loading_spinner.dart';
import '../../widgets/rooms/bed_card.dart';
import '../../widgets/rooms/room_card.dart';

class RoomsScreen extends StatefulWidget {
  const RoomsScreen({super.key});

  @override
  State<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends State<RoomsScreen> {
  List<Room> _rooms = [];
  List<Room> _filteredRooms = [];
  Booking? _activeBooking;
  String _searchQuery = '';
  String _statusFilter = 'All';
  bool _showSearch = false;
  bool _loading = true;

  // Bed selection
  Room? _selectedRoom;
  Bed? _selectedBed;
  List<Bed> _beds = [];
  String? _selectedSemester;
  DateTime? _arrivalDate;
  bool _submittingBooking = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; });
    await Future.wait([_fetchRooms(), _fetchActiveBooking()]);
    setState(() { _loading = false; });
  }

  Future<void> _fetchRooms() async {
    try {
      // Server returns a flat array of room objects
      final res = await ApiClient.get(ApiConfig.rooms);
      final list = res is List ? res : [];
      setState(() {
        _rooms = list.map((r) => Room.fromJson(Map<String, dynamic>.from(r))).toList();
        _filterRooms();
      });
    } catch (_) {}
  }

  Future<void> _fetchActiveBooking() async {
    try {
      // Server returns the booking object directly (not nested)
      final res = await ApiClient.get(ApiConfig.activeBooking);
      setState(() {
        _activeBooking = res is Map ? Booking.fromJson(Map<String, dynamic>.from(res)) : null;
      });
    } catch (_) {
      setState(() { _activeBooking = null; });
    }
  }

  void _filterRooms() {
    setState(() {
      _filteredRooms = _rooms.where((r) {
        final matchesSearch = _searchQuery.isEmpty ||
            (r.roomNumber?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false) ||
            (r.hostel?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
        final matchesStatus = _statusFilter == 'All' ||
            r.status?.toLowerCase() == _statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
      }).toList();
    });
  }

  Future<void> _openBedSheet(Room room) async {
    _selectedRoom = room;
    _selectedBed = null;
    _selectedSemester = null;
    _arrivalDate = null;
    _beds = [];
    _submittingBooking = false;

    // Fetch beds before opening sheet
    List<Bed> fetchedBeds = [];
    try {
      // Server returns a flat array of bed objects
      final res = await ApiClient.get(ApiConfig.roomBeds(room.id));
      final list = res is List ? res : [];
      fetchedBeds = list.map((b) => Bed.fromJson(Map<String, dynamic>.from(b))).toList();
    } catch (_) {}

    if (!mounted) return;
    _beds = fetchedBeds;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (_, scrollController) => Padding(
            padding: const EdgeInsets.all(20),
            child: ListView(
              controller: scrollController,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 16),
                const Text('Select a Bed', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  Chip(label: Text(room.roomNumber ?? '')),
                  Chip(label: Text(room.hostel ?? '')),
                  Chip(label: Text(room.campus ?? '')),
                  Chip(label: Text(room.roomType ?? '')),
                  Chip(label: Text('KES ${Helpers.formatAmount(room.price ?? 0)}')),
                ]),
                const SizedBox(height: 20),
                if (_beds.isEmpty)
                  const Center(child: Text('No beds found', style: TextStyle(color: Colors.grey)))
                else ...[
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.1),
                    itemCount: _beds.length,
                    itemBuilder: (_, i) => BedCard(
                      bed: _beds[i],
                      isSelected: _selectedBed?.id == _beds[i].id,
                      onTap: () => setSheetState(() { _selectedBed = _beds[i]; }),
                    ),
                  ),
                  const SizedBox(height: 20),
                  DropdownButtonFormField<String>(
                    value: _selectedSemester,
                    decoration: const InputDecoration(labelText: 'Semester'),
                    items: AppConstants.semesters.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                    onChanged: (val) => setSheetState(() { _selectedSemester = val; }),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: DateTime.now().add(const Duration(days: 1)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) setSheetState(() { _arrivalDate = picked; });
                    },
                    icon: const Icon(Icons.calendar_today),
                    label: Text(_arrivalDate != null ? Helpers.formatDate(_arrivalDate!.toIso8601String()) : 'Select Arrival Date'),
                  ),
                  const SizedBox(height: 20),
                  CustomButton(
                    label: 'Confirm Booking',
                    isLoading: _submittingBooking,
                    onPressed: (_selectedBed == null || _selectedSemester == null)
                        ? null
                        : () => _submitBooking(setSheetState),
                  ),
                ],
              ],
            ),
          ),
        );
      }),
    );
  }

  Future<void> _submitBooking(StateSetter setSheetState) async {
    setSheetState(() { _submittingBooking = true; });
    try {
      await ApiClient.post(ApiConfig.bookings, body: {
        // Parse to int — server expects integer foreign keys
        'room_id': int.tryParse(_selectedRoom!.id ?? '') ?? _selectedRoom!.id,
        'bed_id': int.tryParse(_selectedBed!.id ?? '') ?? _selectedBed!.id,
        'semester': _selectedSemester,
        'arrival_date': _arrivalDate?.toIso8601String().split('T').first,
      });
      if (mounted) Navigator.pop(context);
      AwesomeDialog(
        context: context,
        dialogType: DialogType.success,
        title: 'Booking Submitted',
        desc: 'Your booking for Room ${_selectedRoom!.roomNumber} Bed ${_selectedBed!.bedNumber} has been submitted and is pending admin approval.',
        btnOkOnPress: () {},
      ).show();
      _loadData();
    } catch (e) {
      AwesomeDialog(
        context: context,
        dialogType: DialogType.error,
        title: 'Error',
        desc: e.toString().replaceFirst('Exception: ', ''),
        btnOkOnPress: () {},
      ).show();
    }
    setSheetState(() { _submittingBooking = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Rooms'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close : Icons.search),
            onPressed: () => setState(() { _showSearch = !_showSearch; if (!_showSearch) { _searchQuery = ''; _filterRooms(); } }),
          ),
        ],
      ),
      body: _loading
          ? const LoadingSpinner()
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
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
                            Text('Find Your Perfect Room at Zetech', style: TextStyle(color: AppTheme.secondary, fontSize: 22, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                            SizedBox(height: 8),
                            Text('Browse and book available hostel rooms', style: TextStyle(color: Colors.white70, fontSize: 14)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Active booking warning
                    if (_activeBooking != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(8)),
                        child: const Row(
                          children: [
                            Icon(Icons.warning_amber, color: Colors.orange),
                            SizedBox(width: 8),
                            Expanded(child: Text('You already have an active booking', style: TextStyle(fontWeight: FontWeight.bold))),
                          ],
                        ),
                      ),

                    // Search & Filter
                    if (_showSearch)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: TextField(
                          decoration: const InputDecoration(hintText: 'Search by room number or hostel...', prefixIcon: Icon(Icons.search)),
                          onChanged: (val) { _searchQuery = val; _filterRooms(); },
                        ),
                      ),
                    Row(
                      children: [
                        const Text('Filter: ', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(width: 8),
                        DropdownButton<String>(
                          value: _statusFilter,
                          items: ['All', 'Available', 'Full', 'Maintenance'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                          onChanged: (val) { _statusFilter = val!; _filterRooms(); },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Rooms Grid
                    if (_filteredRooms.isEmpty)
                      const EmptyState(icon: Icons.hotel, title: 'No rooms available', subtitle: 'Try adjusting your search or filter')
                    else
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.75),
                        itemCount: _filteredRooms.length,
                        itemBuilder: (_, i) => RoomCard(
                          room: _filteredRooms[i],
                          hasActiveBooking: _activeBooking != null,
                          onSelectBed: () => _openBedSheet(_filteredRooms[i]),
                        ),
                      ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }
}
