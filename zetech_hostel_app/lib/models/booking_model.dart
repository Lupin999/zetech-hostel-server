class Booking {
  final String? id;
  final String? userId;
  final String? roomId;
  final String? bedId;
  final String? semester;
  final String? arrivalDate;
  final String? status;
  final bool? suspended;
  final String? roomNumber;
  final String? hostel;
  final String? bedNumber;
  final String? bedPosition;
  final double? price;
  final String? createdAt;

  Booking({this.id, this.userId, this.roomId, this.bedId, this.semester, this.arrivalDate, this.status, this.suspended, this.roomNumber, this.hostel, this.bedNumber, this.bedPosition, this.price, this.createdAt});

  factory Booking.fromJson(Map<String, dynamic> json) => Booking(
    id: (json['_id'] ?? json['id'])?.toString(),
    userId: (json['userId'] ?? json['user_id'])?.toString(),
    roomId: (json['roomId'] ?? json['room_id'])?.toString(),
    bedId: (json['bedId'] ?? json['bed_id'])?.toString(),
    semester: json['semester']?.toString(),
    arrivalDate: (json['arrivalDate'] ?? json['arrival_date'])?.toString(),
    status: json['status']?.toString(),
    suspended: _readBool(json['suspended']),
    roomNumber: (json['roomNumber'] ?? json['room_number'])?.toString(),
    hostel: json['hostel']?.toString(),
    bedNumber: _readBedNumber(json['bedNumber'] ?? json['bed_number']),
    bedPosition: (json['bedPosition'] ?? json['bed_position'] ?? json['position'])?.toString(),
    price: _readDouble(json['price']),
    createdAt: (json['createdAt'] ?? json['created_at'])?.toString(),
  );

  static String? _readBedNumber(dynamic value) {
    final bedNumber = value?.toString().trim();
    return bedNumber == null || bedNumber.isEmpty || bedNumber == '0'
        ? null
        : bedNumber;
  }

  static bool? _readBool(dynamic value) {
    if (value == null) return null;
    return value == true || value == 1 || value.toString() == '1';
  }

  static double? _readDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return value == null ? null : double.tryParse(value.toString());
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'roomId': roomId,
    'bedId': bedId,
    'semester': semester,
    'arrivalDate': arrivalDate,
    'status': status,
    'suspended': suspended,
    'roomNumber': roomNumber,
    'hostel': hostel,
    'bedNumber': bedNumber,
    'bedPosition': bedPosition,
    'price': price,
    'createdAt': createdAt,
  };
}
