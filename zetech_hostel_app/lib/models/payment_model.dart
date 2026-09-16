class Payment {
  final String? id;
  final String? bookingId;
  final double? amount;
  final String? paymentMethod;
  final String? mpesaCode;
  final String? status;
  final String? paymentDate;
  final String? roomNumber;
  final String? hostel;
  final String? semester;

  Payment({this.id, this.bookingId, this.amount, this.paymentMethod, this.mpesaCode, this.status, this.paymentDate, this.roomNumber, this.hostel, this.semester});

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
    id: (json['_id'] ?? json['id'])?.toString(),
    bookingId: (json['bookingId'] ?? json['booking_id'])?.toString(),
    amount: (json['amount'] as num?)?.toDouble(),
    paymentMethod: (json['paymentMethod'] ?? json['payment_method'])?.toString(),
    mpesaCode: (json['mpesaCode'] ?? json['mpesa_code'])?.toString(),
    status: json['status']?.toString(),
    paymentDate: (json['paymentDate'] ?? json['payment_date'] ?? json['created_at'])?.toString(),
    roomNumber: (json['roomNumber'] ?? json['room_number'])?.toString(),
    hostel: json['hostel']?.toString(),
    semester: json['semester']?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'bookingId': bookingId,
    'amount': amount,
    'paymentMethod': paymentMethod,
    'mpesaCode': mpesaCode,
    'status': status,
    'paymentDate': paymentDate,
    'roomNumber': roomNumber,
    'hostel': hostel,
    'semester': semester,
  };
}
