class NotificationModel {
  final String? id;
  final String? userId;
  final String? message;
  final String? type;
  final bool? isRead;
  final String? createdAt;

  NotificationModel({this.id, this.userId, this.message, this.type, this.isRead, this.createdAt});

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
    id: (json['_id'] ?? json['id'])?.toString(),
    userId: (json['userId'] ?? json['user_id'])?.toString(),
    message: json['message']?.toString(),
    type: json['type']?.toString(),
    isRead: json['isRead'] ?? json['is_read'],
    createdAt: (json['createdAt'] ?? json['created_at'])?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'message': message,
    'type': type,
    'isRead': isRead,
    'createdAt': createdAt,
  };
}
