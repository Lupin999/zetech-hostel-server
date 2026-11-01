import 'package:flutter_test/flutter_test.dart';
import 'package:zetech_hostel_app/models/bed_model.dart';
import 'package:zetech_hostel_app/models/booking_model.dart';
import 'package:zetech_hostel_app/models/payment_model.dart';
import 'package:zetech_hostel_app/models/room_model.dart';

void main() {
  test('booking model preserves database bed labels and hides zero placeholders', () {
    final booking = Booking.fromJson({
      'id': 8,
      'room_number': '12',
      'bed_number': 'B2',
    });
    final placeholder = Booking.fromJson({
      'id': 9,
      'room_number': '12',
      'bed_number': '0',
    });

    expect(booking.bedNumber, 'B2');
    expect(placeholder.bedNumber, isNull);
  });

  test('bed model accepts string bed labels from the API', () {
    final bed = Bed.fromJson({'id': 2, 'room_id': 3, 'bed_number': 'B1'});
    final placeholder = Bed.fromJson({'id': 3, 'room_id': 3, 'bed_number': '0'});

    expect(bed.bedNumber, 'B1');
    expect(placeholder.bedNumber, isNull);
  });

  test('database decimal strings are parsed into numeric prices and amounts', () {
    final booking = Booking.fromJson({'price': '30000.00'});
    final room = Room.fromJson({'price': '30000.00'});
    final payment = Payment.fromJson({'amount': '12000.00'});

    expect(booking.price, 30000);
    expect(room.price, 30000);
    expect(payment.amount, 12000);
  });
}
