import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

// Helper function to check if user can access management features
Future<bool> _canAccessManagement() async {
  final prefs = await SharedPreferences.getInstance();
  final userRole = prefs.getString('user_role');
  return userRole ==
      'coaching_admin'; // Only coaching_admin can manage students, teachers, etc.
}

// Provides a list of students
final studentsProvider = FutureProvider<List<dynamic>>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/students',
    cacheKey: 'admin_students',
  );
  return result.data as List<dynamic>;
});

// Provides students for a specific batch
final batchStudentsProvider = FutureProvider.family<List<dynamic>, int>((
  ref,
  batchId,
) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/students?batchId=$batchId',
    cacheKey: 'admin_students_$batchId',
  );
  return result.data as List<dynamic>;
});

// Provides a list of teachers
final teachersProvider = FutureProvider<List<dynamic>>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/teachers',
    cacheKey: 'admin_teachers',
  );
  return result.data as List<dynamic>;
});

// Provides a list of batches
final batchesProvider = FutureProvider<List<dynamic>>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/batches',
    cacheKey: 'admin_batches',
  );
  return result.data as List<dynamic>;
});

// Provides a list of subjects
final subjectsProvider = FutureProvider<List<dynamic>>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/subjects',
    cacheKey: 'admin_subjects',
  );
  return result.data as List<dynamic>;
});

// Provides a batch's own weekly schedule template (replaces the old
// standalone /admin/timetable list — a batch's schedule now lives under the
// batch itself).
final batchScheduleProvider = FutureProvider.family<List<dynamic>, int>((
  ref,
  batchId,
) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/batches/$batchId/schedule',
    cacheKey: 'admin_batch_schedule_$batchId',
  );
  return result.data as List<dynamic>;
});

// Provides teacher-batch-subject assignments, optionally filtered by
// teacherId and/or batchId (both optional — matches the backend's
// GET /admin/teacher-assignments?teacherId=&batchId=).
final teacherAssignmentsProvider =
    FutureProvider.family<List<dynamic>, ({int? teacherId, int? batchId})>((
      ref,
      filter,
    ) async {
      final canAccess = await _canAccessManagement();
      if (!canAccess) return [];
      final api = ref.watch(apiServiceProvider);
      final params = <String>[];
      if (filter.teacherId != null) params.add('teacherId=${filter.teacherId}');
      if (filter.batchId != null) params.add('batchId=${filter.batchId}');
      final query = params.isNotEmpty ? '?${params.join('&')}' : '';
      final result = await api.get('/admin/teacher-assignments$query');
      return result as List<dynamic>;
    });

// Provides fee records
final feesProvider = FutureProvider.family<List<dynamic>, String?>((
  ref,
  status,
) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  String endpoint = '/admin/fees';
  if (status != null && status.isNotEmpty && status != 'all') {
    endpoint += '?status=$status';
  }
  final cacheKey = 'admin_fees_${status ?? 'all'}';
  final result = await api.cachedGet(endpoint, cacheKey: cacheKey);
  return result.data as List<dynamic>;
});

// Provides fee analytics data
final feeAnalyticsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return {};
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/fees/analytics',
    cacheKey: 'admin_fee_analytics',
  );
  return result.data as Map<String, dynamic>;
});

// Provides performance reports. `batchId` is optional — null means "all
// batches", matching the backend's `GET /admin/reports/performance?batchId=`.
final performanceReportProvider =
    FutureProvider.family<Map<String, dynamic>, int?>((ref, batchId) async {
      final canAccess = await _canAccessManagement();
      if (!canAccess) {
        return {}; // Return empty map for non-coaching_admin roles
      }
      final api = ref.watch(apiServiceProvider);
      final endpoint = batchId != null
          ? '/admin/reports/performance?batchId=$batchId'
          : '/admin/reports/performance';
      final response = await api.get(endpoint);
      return response as Map<String, dynamic>;
    });

// Provides the logged-in coaching_admin's own notification inbox
final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) return [];
  final api = ref.watch(apiServiceProvider);
  final result = await api.cachedGet(
    '/admin/notifications',
    cacheKey: 'admin_notifications',
  );
  return result.data as List<dynamic>;
});

final unreadNotificationCountProvider = FutureProvider<int>((ref) async {
  final canAccess = await _canAccessManagement();
  if (!canAccess) {
    return 0;
  }
  final api = ref.watch(apiServiceProvider);
  final response =
      await api.get('/admin/notifications/unread-count')
          as Map<String, dynamic>;
  return response['count'] as int? ?? 0;
});

// ─────────────────────────── Write actions ───────────────────────────
// Plain helper functions (not providers) — screens call these directly via
// `ref.read(apiServiceProvider)`, then `ref.invalidate(...)` the relevant
// list provider above to refetch. Every endpoint/method/body shape here
// matches the backend's admin routes + zod validators exactly.

Future<Map<String, dynamic>> createTeacher(
  ApiService api, {
  required String fullName,
  required String phone,
  required String password,
  String? email,
}) async {
  final body = <String, dynamic>{
    'fullName': fullName,
    'phone': phone,
    'password': password,
    if (email != null && email.isNotEmpty) 'email': email,
  };
  return await api.post('/admin/teachers', body) as Map<String, dynamic>;
}

Future<void> deleteTeacher(ApiService api, int id) async {
  await api.delete('/admin/teachers/$id');
}

Future<Map<String, dynamic>> createStudent(
  ApiService api, {
  required String fullName,
  required String phone,
  required String password,
  required String parentPhone,
  required int batchId,
  String? parentName,
  String? grade,
  String? rollNo,
  int? feeOverrideAmount,
}) async {
  final body = <String, dynamic>{
    'fullName': fullName,
    'phone': phone,
    'password': password,
    'parentPhone': parentPhone,
    'batchId': batchId,
    if (parentName != null && parentName.isNotEmpty) 'parentName': parentName,
    if (grade != null && grade.isNotEmpty) 'grade': grade,
    if (rollNo != null && rollNo.isNotEmpty) 'rollNo': rollNo,
    if (feeOverrideAmount != null) 'feeOverrideAmount': feeOverrideAmount,
  };
  return await api.post('/admin/students', body) as Map<String, dynamic>;
}

Future<void> updateStudent(
  ApiService api,
  int id, {
  String? fullName,
  String? phone,
  String? password,
  String? parentPhone,
  int? batchId,
  String? parentName,
  String? grade,
  String? rollNo,
  int? feeOverrideAmount,
}) async {
  final body = <String, dynamic>{
    if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
    if (phone != null && phone.isNotEmpty) 'phone': phone,
    if (password != null && password.isNotEmpty) 'password': password,
    if (parentPhone != null && parentPhone.isNotEmpty)
      'parentPhone': parentPhone,
    if (batchId != null) 'batchId': batchId,
    if (parentName != null) 'parentName': parentName,
    if (grade != null) 'grade': grade,
    if (rollNo != null) 'rollNo': rollNo,
    if (feeOverrideAmount != null) 'feeOverrideAmount': feeOverrideAmount,
  };
  await api.put('/admin/students/$id', body);
}

/// Deletes a student outright if they have no attendance/fee/test history;
/// otherwise the backend soft-deletes them (deactivates the account) to
/// keep that history intact. Returns `{softDeleted: bool}` so the caller
/// can tell which happened.
Future<Map<String, dynamic>> deleteStudent(ApiService api, int id) async {
  return await api.delete('/admin/students/$id') as Map<String, dynamic>;
}

Future<Map<String, dynamic>> suspendStudent(ApiService api, int id) async {
  return await api.patch('/admin/students/$id/suspend', {})
      as Map<String, dynamic>;
}

Future<Map<String, dynamic>> getStudentDetails(ApiService api, int id) async {
  return await api.get('/admin/students/$id/details') as Map<String, dynamic>;
}

final studentDetailsProvider = FutureProvider.family<Map<String, dynamic>, int>(
  (ref, id) async {
    final api = ref.watch(apiServiceProvider);
    final result = await api.cachedGet(
      '/admin/students/$id/details',
      cacheKey: 'admin_student_details_$id',
    );
    return result.data as Map<String, dynamic>;
  },
);

Future<Map<String, dynamic>> createBatch(
  ApiService api, {
  required String name,
  String? grade,
  List<int> subjectIds = const [],
  int? feeAmount,
  String? billingCycle,
}) async {
  final body = <String, dynamic>{
    'name': name,
    if (grade != null && grade.isNotEmpty) 'grade': grade,
    'subjectIds': subjectIds,
    if (feeAmount != null) 'feeAmount': feeAmount,
    if (billingCycle != null) 'billingCycle': billingCycle,
  };
  return await api.post('/admin/batches', body) as Map<String, dynamic>;
}

Future<Map<String, dynamic>> updateBatch(
  ApiService api,
  int id, {
  String? name,
  String? grade,
  List<int>? subjectIds,
  int? feeAmount,
  String? billingCycle,
}) async {
  final body = <String, dynamic>{
    if (name != null && name.isNotEmpty) 'name': name,
    if (grade != null) 'grade': grade,
    if (subjectIds != null) 'subjectIds': subjectIds,
    if (feeAmount != null) 'feeAmount': feeAmount,
    if (billingCycle != null) 'billingCycle': billingCycle,
  };
  return await api.put('/admin/batches/$id', body) as Map<String, dynamic>;
}

/// Deletes a batch outright if it has no enrolled students; otherwise the
/// backend soft-deletes it (marks inactive) to keep historical records
/// intact. Returns `{softDeleted: bool}` so the caller can tell which
/// happened.
Future<Map<String, dynamic>> deleteBatch(ApiService api, int id) async {
  return await api.delete('/admin/batches/$id') as Map<String, dynamic>;
}

Future<Map<String, dynamic>> createSubject(
  ApiService api, {
  required String name,
}) async {
  return await api.post('/admin/subjects', {'name': name})
      as Map<String, dynamic>;
}

Future<void> updateSubject(ApiService api, int id, {required String name}) async {
  await api.put('/admin/subjects/$id', {'name': name});
}

/// Returns `{softDeleted: bool}` — soft-deleted when the subject still has
/// content/tests/schedule/assignments referencing it, hard-deleted otherwise.
Future<Map<String, dynamic>> deleteSubject(ApiService api, int id) async {
  return await api.delete('/admin/subjects/$id') as Map<String, dynamic>;
}

/// Fully replaces a batch's weekly schedule template with [scheduleEntries]
/// (each `{subjectId, dayOfWeek, startTime, endTime}`). Matches the
/// backend's full-replace semantics — pass the batch's entire desired
/// schedule, not just one new row. May throw a 409 `TEACHER_SCHEDULE_CLASH`
/// (via [friendlyErrorMessage]) if the new schedule clashes with a teacher
/// already assigned to this batch.
Future<List<dynamic>> setBatchSchedule(
  ApiService api,
  int batchId,
  List<Map<String, dynamic>> scheduleEntries,
) async {
  final result = await api.put('/admin/batches/$batchId/schedule', {
    'scheduleEntries': scheduleEntries,
  });
  return result as List<dynamic>;
}

/// Assigns a teacher to teach [subjectId] within [batchId]. May throw a 409
/// with code `TEACHER_SCHEDULE_CLASH` (day/time overlap with another of the
/// teacher's assignments) or `ALREADY_ASSIGNED` (duplicate) — surface via
/// [friendlyErrorMessage].
Future<Map<String, dynamic>> assignTeacherToBatch(
  ApiService api, {
  required int teacherUserId,
  required int batchId,
  required int subjectId,
}) async {
  final body = <String, dynamic>{
    'teacherUserId': teacherUserId,
    'batchId': batchId,
    'subjectId': subjectId,
  };
  return await api.post('/admin/teacher-assignments', body)
      as Map<String, dynamic>;
}

Future<void> removeTeacherAssignment(ApiService api, int id) async {
  await api.delete('/admin/teacher-assignments/$id');
}

Future<Map<String, dynamic>> recordPayment(
  ApiService api, {
  required int studentId,
  required int amountPaid,
  String method = 'cash',
  int? feeDueId,
}) async {
  final body = <String, dynamic>{
    'studentId': studentId,
    'amountPaid': amountPaid,
    'method': method,
    'feeDueId': ?feeDueId,
  };
  return await api.post('/admin/fees/payments', body) as Map<String, dynamic>;
}

Future<Map<String, dynamic>> sendFeeReminder(
  ApiService api,
  int studentId,
) async {
  return await api.post('/admin/fees/$studentId/remind', {})
      as Map<String, dynamic>;
}

Future<void> markNotificationRead(ApiService api, int id) async {
  await api.patch('/admin/notifications/$id/read', {});
}

/// Broadcasts a notification to students or teachers in the caller's own
/// institute — everyone (of that role), or filtered by batch. Returns
/// `{recipientCount}`.
Future<Map<String, dynamic>> broadcastToStudents(
  ApiService api, {
  required String title,
  String? body,
  int? batchId,
  String targetRole = 'student',
}) async {
  final requestBody = <String, dynamic>{
    'title': title,
    if (body != null && body.isNotEmpty) 'body': body,
    'batchId': ?batchId,
    'targetRole': targetRole,
  };
  return await api.post('/admin/notifications/broadcast', requestBody)
      as Map<String, dynamic>;
}
