class HealthProfile {
  final String? id;
  final String? userId;
  final String? medicalConditions;
  final String? dietaryRestrictions;
  final String? updatedAt;

  HealthProfile({this.id, this.userId, this.medicalConditions, this.dietaryRestrictions, this.updatedAt});

  factory HealthProfile.fromJson(Map<String, dynamic> json) => HealthProfile(
    id: (json['_id'] ?? json['id'])?.toString(),
    userId: (json['userId'] ?? json['user_id'])?.toString(),
    medicalConditions: (json['medicalConditions'] ?? json['medical_conditions'])?.toString(),
    dietaryRestrictions: (json['dietaryRestrictions'] ?? json['dietary_restrictions'])?.toString(),
    updatedAt: (json['updatedAt'] ?? json['updated_at'])?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'medicalConditions': medicalConditions,
    'dietaryRestrictions': dietaryRestrictions,
    'updatedAt': updatedAt,
  };
}
