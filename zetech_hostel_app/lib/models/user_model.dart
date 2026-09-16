class User {
  final String? id;
  final String? regNo;
  final String? email;
  final String? fullName;
  final String? role;
  final String? campus;
  final String? phone;
  final String? course;

  User({this.id, this.regNo, this.email, this.fullName, this.role, this.campus, this.phone, this.course});

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: (json['_id'] ?? json['id'])?.toString(),
    regNo: (json['regNo'] ?? json['reg_no'])?.toString(),
    email: json['email']?.toString(),
    fullName: (json['fullName'] ?? json['full_name'])?.toString(),
    role: json['role']?.toString(),
    campus: json['campus']?.toString(),
    phone: json['phone']?.toString(),
    course: json['course']?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'regNo': regNo,
    'email': email,
    'fullName': fullName,
    'role': role,
    'campus': campus,
    'phone': phone,
    'course': course,
  };
}
