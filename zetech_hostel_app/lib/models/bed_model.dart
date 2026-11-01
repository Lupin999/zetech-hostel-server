class Bed {
  final String? id;
  final String? roomId;
  final String? bedNumber;
  final String? position;
  final String? status;

  Bed({this.id, this.roomId, this.bedNumber, this.position, this.status});

  factory Bed.fromJson(Map<String, dynamic> json) => Bed(
    id: (json['_id'] ?? json['id'])?.toString(),
    roomId: (json['roomId'] ?? json['room_id'])?.toString(),
    bedNumber: _readBedNumber(json['bedNumber'] ?? json['bed_number']),
    position: json['position']?.toString(),
    status: json['status']?.toString(),
  );

  static String? _readBedNumber(dynamic value) {
    final bedNumber = value?.toString().trim();
    return bedNumber == null || bedNumber.isEmpty || bedNumber == '0'
        ? null
        : bedNumber;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'roomId': roomId,
    'bedNumber': bedNumber,
    'position': position,
    'status': status,
  };
}
