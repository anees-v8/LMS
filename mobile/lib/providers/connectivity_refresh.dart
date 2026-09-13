import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dashboard_provider.dart';
import 'management_providers.dart';
import 'payment_providers.dart';
import 'student_providers.dart';
import 'superadmin_providers.dart';
// Prefixed: management_providers.dart and teacher_providers.dart each
// independently declare a top-level `batchStudentsProvider` (different
// providers, same name — coaching_admin's vs the teacher's own). Importing
// both unprefixed in the same file is a compile error, so this file refers
// to the teacher one as `teacher.batchStudentsProvider`.
import 'teacher_providers.dart' as teacher;

/// Every data-fetching provider in the app that should silently refetch the
/// moment connectivity is restored — the WhatsApp-style "came back online,
/// data just updates itself" behavior. Deliberately an explicit list rather
/// than invalidating every currently-alive provider: this excludes
/// UI/selection-state `NotifierProvider`s (e.g. `selectedAnalyticsMonthProvider`,
/// `teacherShellTabIndexProvider`) that must NOT reset just because the
/// network came back, and keeps this refresh scoped to providers we've
/// actually reviewed. `ref.invalidate(familyProvider)` invalidates every
/// currently-instantiated argument variant of that family, so listing the
/// bare family provider (not each call site's arguments) is enough.
///
/// When adding a new `FutureProvider`/`FutureProvider.family` elsewhere in
/// `lib/providers/`, add it here too so it participates in reconnect refresh.
///
/// Untyped (not `List<ProviderOrFamily>`): that type exists in riverpod's
/// core but isn't part of flutter_riverpod's public export surface, and a
/// plain `FutureProvider` and a `FutureProvider.family` don't share any
/// other common public supertype either — `ProviderContainer.invalidate`
/// itself only requires "a provider or a family", so a dynamic list handed
/// straight to it is the pragmatic fit here.
final List<dynamic> connectivityRefreshProviders = [
  // dashboard_provider.dart
  dashboardProvider,

  // management_providers.dart (coaching_admin)
  studentsProvider,
  batchStudentsProvider,
  teachersProvider,
  batchesProvider,
  subjectsProvider,
  batchScheduleProvider,
  teacherAssignmentsProvider,
  feesProvider,
  feeAnalyticsProvider,
  performanceReportProvider,
  notificationsProvider,
  unreadNotificationCountProvider,
  studentDetailsProvider,

  // payment_providers.dart
  subscriptionStatusProvider,
  publicPlansProvider,

  // student_providers.dart
  studentDashboardProvider,
  studentSubjectsProvider,
  studentChaptersProvider,
  studentChapterContentProvider,
  studentTodayLiveProvider,
  studentUpcomingLiveProvider,
  studentFeesProvider,
  studentNotificationsProvider,
  studentUnreadNotificationCountProvider,
  studentTestsProvider,
  studentProfileProvider,
  studentAttendanceProvider,
  studentPerformanceProvider,

  // superadmin_providers.dart
  tenantsProvider,
  plansProvider,
  subscriptionsProvider,
  expiringSubscriptionsProvider,
  leadsProvider,
  unreadLeadsCountProvider,
  tenantSubscriptionProvider,
  tenantDashboardProvider,

  // teacher_providers.dart
  teacher.teacherNotificationsProvider,
  teacher.teacherUnreadNotificationCountProvider,
  teacher.todayScheduleProvider,
  teacher.myBatchesProvider,
  teacher.batchStudentsProvider,
  teacher.attendanceBatchStudentsProvider,
  teacher.testsProvider,
  teacher.testQuestionsProvider,
  teacher.teacherContentProvider,
  teacher.teacherSubjectsProvider,
  teacher.teacherChaptersProvider,
  teacher.qrSessionStatusProvider,
  teacher.teacherStudentDetailsProvider,
  teacher.teacherLiveClassesProvider,
  teacher.googleConnectionStatusProvider,
];

/// Invalidates every provider in [connectivityRefreshProviders]. Takes a
/// [ProviderContainer] (not a widget's [Ref]) because the connectivity
/// listener in `main.dart` runs outside any widget's build method — same
/// reason [PushNotificationService] already holds `rootProviderContainer`
/// for its own cross-provider updates.
void refreshAllData(ProviderContainer container) {
  for (final provider in connectivityRefreshProviders) {
    container.invalidate(provider);
  }
}
