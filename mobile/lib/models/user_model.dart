/// Mirrors the backend's `PublicUser` shape returned by
/// `/auth/login`, `/auth/me` and `/auth/refresh`
/// (see `userRepo.toPublicUser` in the backend).
class UserModel {
  final int id;
  final String fullName;
  final String phone;
  final String role;
  final int? tenantId; // null only for super_admin
  final String? email;

  UserModel({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.role,
    this.tenantId,
    this.email,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse(json['id']?.toString() ?? '') ?? 0,
      fullName: json['fullName']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      tenantId: json['tenantId'] is int
          ? json['tenantId'] as int
          : int.tryParse(json['tenantId']?.toString() ?? ''),
      email: json['email']?.toString(),
    );
  }
}
