class Bed {
  final String? id;
  final String? roomId;
  final int? bedNumber;
  final String? position;
  final String? status;

  Bed({this.id, this.roomId, this.bedNumber, this.position, this.status});

  factory Bed.fromJson(Map<String, dynamic> json) => Bed(
    id: (json['_id'] ?? json['id'])?.toString(),
    roomId: (json['roomId'] ?? json['room_id'])?.toString(),
    bedNumber: json['bedNumber'] ?? json['bed_number'],
    position: json['position']?.toString(),
    status: json['status']?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'roomId': roomId,
    'bedNumber': bedNumber,
    'position': position,
    'status': status,
  };
}
