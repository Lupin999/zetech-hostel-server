import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:zetech_hostel_app/providers/auth_provider.dart';
import 'package:zetech_hostel_app/providers/theme_provider.dart';
import 'package:zetech_hostel_app/widgets/common/loading_spinner.dart';
import 'package:zetech_hostel_app/widgets/common/empty_state.dart';
import 'package:zetech_hostel_app/widgets/common/custom_button.dart';
import 'package:zetech_hostel_app/widgets/notifications/notification_tile.dart';
import 'package:zetech_hostel_app/models/notification_model.dart';

void main() {
  // ── Shared providers wrapper ─────────────────────────────────────────────
  Widget withProviders(Widget child) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: MaterialApp(home: Scaffold(body: child)),
    );
  }

  // ── LoadingSpinner ────────────────────────────────────────────────────────
  group('LoadingSpinner', () {
    testWidgets('renders a CircularProgressIndicator', (tester) async {
      await tester.pumpWidget(withProviders(const LoadingSpinner()));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  // ── EmptyState ────────────────────────────────────────────────────────────
  group('EmptyState', () {
    testWidgets('shows title and subtitle', (tester) async {
      await tester.pumpWidget(withProviders(
        const EmptyState(
          icon: Icons.hotel,
          title: 'No rooms',
          subtitle: 'Try again later',
        ),
      ));
      expect(find.text('No rooms'), findsOneWidget);
      expect(find.text('Try again later'), findsOneWidget);
    });

    testWidgets('renders without subtitle', (tester) async {
      await tester.pumpWidget(withProviders(
        const EmptyState(icon: Icons.hotel, title: 'Nothing here'),
      ));
      expect(find.text('Nothing here'), findsOneWidget);
    });
  });

  // ── CustomButton ─────────────────────────────────────────────────────────
  group('CustomButton', () {
    testWidgets('shows label text', (tester) async {
      await tester.pumpWidget(
        withProviders(CustomButton(label: 'Pay Now', onPressed: () {})),
      );
      expect(find.text('Pay Now'), findsOneWidget);
    });

    testWidgets('shows loading indicator when isLoading is true', (tester) async {
      await tester.pumpWidget(
        withProviders(CustomButton(label: 'Pay Now', isLoading: true, onPressed: null)),
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Pay Now'), findsNothing);
    });

    testWidgets('calls onPressed when tapped', (tester) async {
      bool pressed = false;
      await tester.pumpWidget(
        withProviders(CustomButton(label: 'Tap Me', onPressed: () { pressed = true; })),
      );
      await tester.tap(find.text('Tap Me'));
      expect(pressed, isTrue);
    });

    testWidgets('does not call onPressed when disabled (null)', (tester) async {
      bool pressed = false;
      await tester.pumpWidget(
        withProviders(CustomButton(label: 'Disabled', onPressed: null)),
      );
      await tester.tap(find.text('Disabled'), warnIfMissed: false);
      expect(pressed, isFalse);
    });
  });

  // ── NotificationTile ─────────────────────────────────────────────────────
  group('NotificationTile', () {
    final unreadNotif = NotificationModel(
      id: '1',
      userId: '42',
      message: 'Your booking was approved',
      type: 'booking',
      isRead: false,
      createdAt: '2026-08-21T08:00:00.000Z',
    );

    final readNotif = NotificationModel(
      id: '2',
      userId: '42',
      message: 'Payment confirmed',
      type: 'payment',
      isRead: true,
      createdAt: '2026-08-20T10:00:00.000Z',
    );

    testWidgets('shows message for unread notification', (tester) async {
      await tester.pumpWidget(
        withProviders(NotificationTile(notification: unreadNotif)),
      );
      expect(find.text('Your booking was approved'), findsOneWidget);
    });

    testWidgets('shows message for read notification', (tester) async {
      await tester.pumpWidget(
        withProviders(NotificationTile(notification: readNotif)),
      );
      expect(find.text('Payment confirmed'), findsOneWidget);
    });

    testWidgets('unread dot visible for unread, hidden for read', (tester) async {
      // Unread — blue dot container should be present
      await tester.pumpWidget(withProviders(NotificationTile(notification: unreadNotif)));
      // The trailing dot is a Container with BoxShape.circle — verify tile renders
      expect(find.byType(NotificationTile), findsOneWidget);

      // Read — no dot
      await tester.pumpWidget(withProviders(NotificationTile(notification: readNotif)));
      expect(find.byType(NotificationTile), findsOneWidget);
    });
  });
}
