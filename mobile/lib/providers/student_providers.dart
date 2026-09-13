import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

// ─── Student Dashboard (single endpoint returns everything) ──────────────────

final studentDashboardProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  final api = ref.read(apiServiceProvider);
  final data = await api.get('/student/dashboard');
  return data as Map<String, dynamic>;
});

// ─── Student Learn / Subjects ────────────────────────────────────────────────

final studentSubjectsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/subjects') as List<dynamic>;
});

final studentChaptersProvider = FutureProvider.family<List<dynamic>, int>((
  ref,
  subjectId,
) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/subjects/$subjectId/chapters')
      as List<dynamic>;
});

final studentChapterContentProvider = FutureProvider.family<List<dynamic>, int>(
  (ref, chapterId) async {
    final api = ref.read(apiServiceProvider);
    return await api.get('/student/chapters/$chapterId/content')
        as List<dynamic>;
  },
);

// ─── Today's Live Classes ────────────────────────────────────────────────────

final studentTodayLiveProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/live/today') as List<dynamic>;
});

// ─── Upcoming Live Classes (next 7 days) ─────────────────────────────────────

final studentUpcomingLiveProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/live/upcoming') as List<dynamic>;
});

// ─── Student Fees ────────────────────────────────────────────────────────────

final studentFeesProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/fees') as Map<String, dynamic>;
});

// ─── Notifications ───────────────────────────────────────────────────────────

final studentNotificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/notifications') as List<dynamic>;
});

final studentUnreadNotificationCountProvider = FutureProvider<int>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response =
      await api.get('/student/notifications/unread-count')
          as Map<String, dynamic>;
  return response['count'] as int? ?? 0;
});

Future<void> markStudentNotificationRead(ApiService api, int id) async {
  await api.patch('/student/notifications/$id/read', {});
}
// ─── Tests & Quiz ────────────────────────────────────────────────────────────

final studentTestsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/tests') as Map<String, dynamic>;
});

// ─── Profile ─────────────────────────────────────────────────────────────────

final studentProfileProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/profile') as Map<String, dynamic>;
});

final studentAttendanceProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/attendance/monthly') as List<dynamic>;
});

/// Scans a teacher's QR attendance code. Returns
/// `{alreadyMarked, status, batchId, date}` — throws [ApiException] (via
/// [ApiService]) with a clear message for an expired/invalid code.
Future<Map<String, dynamic>> scanAttendanceQr(
  ApiService api,
  String token,
) async {
  return await api.post('/student/attendance/qr-scan', {'token': token})
      as Map<String, dynamic>;
}

final studentPerformanceProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/student/performance') as List<dynamic>;
});
