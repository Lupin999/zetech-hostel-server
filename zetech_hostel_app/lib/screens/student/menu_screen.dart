import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';

class MenuScreen extends StatelessWidget {
  const MenuScreen({super.key});

  static const List<Map<String, String>> _weeklyMenu = [
    {'day': 'Monday', 'meal': 'Rice', 'image': 'assets/images/rice.jpg'},
    {'day': 'Tuesday', 'meal': 'Cabbage', 'image': 'assets/images/cabbage.jpg'},
    {'day': 'Wednesday', 'meal': 'Rice', 'image': 'assets/images/rice.jpg'},
    {'day': 'Thursday', 'meal': 'Ugali', 'image': 'assets/images/ugali.jpg'},
    {'day': 'Friday', 'meal': 'Rice', 'image': 'assets/images/rice.jpg'},
    {'day': 'Saturday', 'meal': 'Mixed', 'image': 'assets/images/mixed.jpg'},
    {'day': 'Sunday', 'meal': 'Pilau', 'image': 'assets/images/pilau.jpg'},
  ];

  int get _todayIndex => DateTime.now().weekday - 1;

  @override
  Widget build(BuildContext context) {
    final today = _weeklyMenu[_todayIndex];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hostel Menu', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Hero Banner
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                image: const DecorationImage(image: AssetImage('assets/images/campus1.jpg'), fit: BoxFit.cover),
              ),
              child: Container(
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), color: Colors.black.withOpacity(0.6)),
                padding: const EdgeInsets.all(24),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Weekly Meal Schedule', style: TextStyle(color: AppTheme.secondary, fontSize: 22, fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('Breakfast 6AM–7AM • Supper 7PM–8PM', style: TextStyle(color: Colors.white70, fontSize: 14)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Today Highlight
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: AppTheme.secondary, width: 2.5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Today — ${today['day']}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(12)),
                          child: const Text('TODAY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.asset(today['image']!, height: 180, width: double.infinity, fit: BoxFit.cover),
                    ),
                    const SizedBox(height: 8),
                    Text(today['meal']!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Weekly Grid
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.68),
              itemCount: _weeklyMenu.length,
              itemBuilder: (_, i) => _buildDayCard(_weeklyMenu[i], i == _todayIndex),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDayCard(Map<String, String> item, bool isToday) {
    return Card(
      elevation: isToday ? 4 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isToday ? AppTheme.secondary : Colors.grey.shade300, width: isToday ? 2 : 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Text(item['day']!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.asset(item['image']!, width: double.infinity, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(height: 6),
            Text(item['meal']!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 4),
            const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.coffee, size: 12, color: Colors.brown),
              SizedBox(width: 3),
              Text('6–7AM', style: TextStyle(fontSize: 10, color: Colors.grey)),
            ]),
            const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.restaurant, size: 12, color: Colors.orange),
              SizedBox(width: 3),
              Text('7–8PM', style: TextStyle(fontSize: 10, color: Colors.grey)),
            ]),
          ],
        ),
      ),
    );
  }
}
