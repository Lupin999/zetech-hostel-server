class Room {
  final String? id;
  final String? roomNumber;
  final String? hostel;
  final String? campus;
  final String? roomType;
  final int? capacity;
  final double? price;
  final String? status;
  final int? occupiedBeds;

  Room({this.id, this.roomNumber, this.hostel, this.campus, this.roomType, this.capacity, this.price, this.status, this.occupiedBeds});

  factory Room.fromJson(Map<String, dynamic> json) => Room(
    id: (json['_id'] ?? json['id'])?.toString(),
    roomNumber: (json['roomNumber'] ?? json['room_number'])?.toString(),
    hostel: json['hostel']?.toString(),
    campus: json['campus']?.toString(),
    roomType: (json['roomType'] ?? json['room_type'])?.toString(),
    capacity: json['capacity'] is int ? json['capacity'] : int.tryParse(json['capacity']?.toString() ?? ''),
    price: (json['price'] as num?)?.toDouble(),
    status: json['status']?.toString(),
    // Server returns the field as 'occupied' (count of approved bookings)
    occupiedBeds: json['occupied'] ?? json['occupiedBeds'] ?? json['occupied_beds'] ?? 0,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'roomNumber': roomNumber,
    'hostel': hostel,
    'campus': campus,
    'roomType': roomType,
    'capacity': capacity,
    'price': price,
    'status': status,
    'occupiedBeds': occupiedBeds,
  };
}
