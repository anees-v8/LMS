import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final teacherNotificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/notifications') as List<dynamic>;
});

final teacherUnreadNotificationCountProvider = FutureProvider<int>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response =
      await api.get('/teacher/notifications/unread-count')
          as Map<String, dynamic>;
  return response['count'] as int? ?? 0;
});

Future<void> markTeacherNotificationRead(ApiService api, int id) async {
  await api.patch('/teacher/notifications/$id/read', {});
}

class TeacherShellTabIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;
  void setTab(int index) => state = index;
}

final teacherShellTabIndexProvider =
    NotifierProvider<TeacherShellTabIndexNotifier, int>(() {
      return TeacherShellTabIndexNotifier();
    });

final todayScheduleProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/schedule/today');
});

final myBatchesProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/batches');
});

final batchStudentsProvider = FutureProvider.family<List<dynamic>, int>((
  ref,
  batchId,
) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/batches/$batchId/students');
});

final attendanceBatchStudentsProvider =
    FutureProvider.family<
      List<dynamic>,
      ({int batchId, String date, int subjectId})
    >((ref, params) async {
      final api = ref.read(apiServiceProvider);
      final batchId = params.batchId;
      final date = params.date;
      return await api.get(
        '/teacher/batches/$batchId/students?date=$date&subjectId=${params.subjectId}',
      );
    });

final testsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/tests');
});

final testQuestionsProvider = FutureProvider.family<List<dynamic>, int>((
  ref,
  testId,
) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/tests/$testId/questions');
});

final teacherContentProvider = FutureProvider.family<List<dynamic>, int?>((
  ref,
  chapterId,
) async {
  final api = ref.read(apiServiceProvider);
  final query = chapterId != null ? '?chapterId=$chapterId' : '';
  return await api.get('/teacher/content$query');
});

final teacherSubjectsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/subjects');
});

final teacherChaptersProvider = FutureProvider.family<List<dynamic>, int?>((
  ref,
  subjectId,
) async {
  final api = ref.read(apiServiceProvider);
  final query = subjectId != null ? '?subjectId=$subjectId' : '';
  return await api.get('/teacher/chapters$query');
});

/// Creates a time-limited QR attendance session for a batch. Returns
/// `{id, token, batchId, date, expiresAt}`.
Future<Map<String, dynamic>> createQrAttendanceSession(
  ApiService api, {
  required int batchId,
  required int subjectId,
  int? batchScheduleId,
  required int validForMinutes,
}) async {
  final body = <String, dynamic>{
    'batchId': batchId,
    'subjectId': subjectId,
    if (batchScheduleId != null) 'batchScheduleId': batchScheduleId,
    'validForMinutes': validForMinutes,
  };
  return await api.post('/teacher/attendance/qr-session', body)
      as Map<String, dynamic>;
}

/// Live status for one QR session — re-fetch by invalidating this
/// provider on a timer while the session screen is open.
final qrSessionStatusProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, sessionId) async {
      final api = ref.read(apiServiceProvider);
      return await api.get('/teacher/attendance/qr-session/$sessionId')
          as Map<String, dynamic>;
    });

/// Same report shape as admin's `studentDetailsProvider` — same backend
/// data (admin.service.getStudentDetails), just via the teacher-scoped
/// route that checks the student is in one of this teacher's batches.
final teacherStudentDetailsProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, studentId) async {
      final api = ref.read(apiServiceProvider);
      return await api.get('/teacher/students/$studentId/details')
          as Map<String, dynamic>;
    });

// ─── Live Classes ─────────────────────────────────────────────────────────────

/// All live classes created by this teacher (upcoming + past).
final teacherLiveClassesProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/live-classes') as List<dynamic>;
});

/// Whether this teacher has connected their Google account — required
/// before a Meet link can be auto-generated for a live class.
final googleConnectionStatusProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  final api = ref.read(apiServiceProvider);
  return await api.get('/teacher/google/status') as Map<String, dynamic>;
});

/// Exchanges the one-time server auth code (from google_sign_in's
/// authorizeServer) for a stored refresh token on the backend.
Future<Map<String, dynamic>> connectGoogleAccount(
  ApiService api,
  String serverAuthCode,
) async {
  return await api.post('/teacher/google/connect', {
        'serverAuthCode': serverAuthCode,
      })
      as Map<String, dynamic>;
}

Future<void> disconnectGoogleAccount(ApiService api) async {
  await api.delete('/teacher/google/disconnect');
}

/// Creates a new live class. Returns the created live class object.
/// Creates a live class — the backend auto-generates the Google Meet link
/// via Calendar API, so no meetUrl is sent from the client.
Future<Map<String, dynamic>> createLiveClass(
  ApiService api, {
  required String title,
  required int batchId,
  required String scheduledAt,
  int? durationMinutes,
}) async {
  return await api.post('/teacher/live-classes', {
        'title': title,
        'batchId': batchId,
        'scheduledAt': scheduledAt,
        if (durationMinutes != null) 'durationMinutes': durationMinutes,
      })
      as Map<String, dynamic>;
}

/// Deletes a live class by ID (only allowed before it starts).
Future<void> deleteLiveClass(ApiService api, int id) async {
  await api.delete('/teacher/live-classes/$id');
}

/// Manually marks a live class as ended. The app has no way to detect when
/// the actual Google Meet call ends, so this is how a teacher moves a class
/// out of "LIVE now" once they're done — the real call must still be ended
/// from within Meet itself.
Future<void> endLiveClass(ApiService api, int id) async {
  await api.patch('/teacher/live-classes/$id/end', {});
}
