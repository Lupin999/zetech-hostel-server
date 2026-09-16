class Notice {
  final String? id;
  final String? title;
  final String? message;
  final String? createdBy;
  final String? authorName;
  final String? createdAt;

  Notice({this.id, this.title, this.message, this.createdBy, this.authorName, this.createdAt});

  factory Notice.fromJson(Map<String, dynamic> json) => Notice(
    id: (json['_id'] ?? json['id'])?.toString(),
    title: json['title']?.toString(),
    message: json['message']?.toString(),
    createdBy: (json['createdBy'] ?? json['created_by'])?.toString(),
    authorName: (json['authorName'] ?? json['author_name'])?.toString(),
    createdAt: (json['createdAt'] ?? json['created_at'])?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'message': message,
    'createdBy': createdBy,
    'authorName': authorName,
    'createdAt': createdAt,
  };
}
