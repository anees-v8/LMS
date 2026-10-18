import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/unified_app_header.dart';
import 'student_active_quiz_screen.dart';
import 'student_test_result_screen.dart';
import 'student_notifications_screen.dart';
import 'student_scan_attendance_screen.dart';

class StudentTestsScreen extends ConsumerStatefulWidget {
  const StudentTestsScreen({super.key});

  @override
  ConsumerState<StudentTestsScreen> createState() => _StudentTestsScreenState();
}

class _StudentTestsScreenState extends ConsumerState<StudentTestsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  DateTime? _getTestDeadline(Map<String, dynamic> test) {
    final validUntilStr = (test['validUntil'] ?? test['valid_until']) as String?;
    if (validUntilStr != null) {
      try {
        return DateTime.parse(validUntilStr).toLocal();
      } catch (_) {}
    }
    final testDateStr = (test['testDate'] ?? test['test_date']) as String?;
    if (testDateStr != null) {
      try {
        return DateTime.parse(testDateStr).toLocal().add(const Duration(hours: 24));
      } catch (_) {}
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final studentName = authState.fullName ?? 'Student';
    final instituteName = authState.instituteName ?? 'Academy';
    final unreadCount =
        ref.watch(studentUnreadNotificationCountProvider).asData?.value ?? 0;

    final parts = studentName.trim().split(' ');
    final initials = parts.length > 1
        ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
        : (studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S');

    final testsAsync = ref.watch(studentTestsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: UnifiedAppHeader(
        title: studentName,
        subtitle: instituteName,
        initials: initials,
        unreadNotificationsCount: unreadCount,
        onProfileTap: () {
          ref.read(studentShellTabIndexProvider.notifier).setTab(4);
        },
        onQrTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const StudentScanAttendanceScreen(),
            ),
          );
        },
        onNotificationsTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const StudentNotificationsScreen(),
            ),
          ).then(
            (_) => ref.invalidate(studentUnreadNotificationCountProvider),
          );
        },
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Assessments',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Track tests, quizzes & results',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  height: 44,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    indicator: BoxDecoration(
                      color: AppColors.primaryDark,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    dividerColor: Colors.transparent,
                    labelColor: Colors.white,
                    unselectedLabelColor: AppColors.textSecondary,
                    labelStyle: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    tabs: testsAsync.when(
                      data: (data) {
                        final rawActive = (data['active'] as List?) ?? [];
                        final rawMissed = (data['missed'] as List?) ?? [];
                        final cCount = (data['completed'] as List?)?.length ?? 0;

                        int aCount = 0;
                        int mCount = rawMissed.length;
                        final now = DateTime.now();

                        for (final item in rawActive) {
                          final test = item as Map<String, dynamic>;
                          final deadline = _getTestDeadline(test);
                          final isMissed = deadline != null && now.isAfter(deadline);
                          if (isMissed) {
                            mCount++;
                          } else {
                            aCount++;
                          }
                        }

                        return [
                          Tab(text: 'Active ($aCount)'),
                          Tab(text: 'Missed ($mCount)'),
                          Tab(text: 'Completed ($cCount)'),
                        ];
                      },
                      loading: () => const [
                        Tab(text: 'Active'),
                        Tab(text: 'Missed'),
                        Tab(text: 'Completed'),
                      ],
                      error: (_, _) => const [
                        Tab(text: 'Active'),
                        Tab(text: 'Missed'),
                        Tab(text: 'Completed'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: testsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(studentTestsProvider);
            ref.invalidate(studentUnreadNotificationCountProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(
              height: 400,
              child: Center(child: Text(friendlyErrorMessage(err))),
            ),
          ),
        ),
        data: (data) {
          final now = DateTime.now();
          final rawActive = data['active'] as List? ?? [];
          final rawMissed = data['missed'] as List? ?? [];
          final completedTests = data['completed'] as List? ?? [];

          final activeTests = <dynamic>[];
          final missedTests = List<dynamic>.from(rawMissed);

          for (final item in rawActive) {
            final test = item as Map<String, dynamic>;
            final deadline = _getTestDeadline(test);
            final isMissed = deadline != null && now.isAfter(deadline);
            if (isMissed) {
              if (!missedTests.any((m) => (m as Map)['id'] == test['id'])) {
                missedTests.add(test);
              }
            } else {
              activeTests.add(test);
            }
          }

          return TabBarView(
            controller: _tabController,
            children: [
              // ── Active / Upcoming ─────────────────────────────────────────
              RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(studentTestsProvider);
                  ref.invalidate(studentUnreadNotificationCountProvider);
                },
                child: activeTests.isEmpty
                    ? const _EmptyState(
                        icon: Icons.quiz_outlined,
                        message: 'No upcoming tests.',
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        itemCount: activeTests.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final test = activeTests[index] as Map<String, dynamic>;
                          final testDateStr = test['testDate'] as String?;
                          bool isFuture = false;
                          String formattedDate = 'No Date';
                          if (testDateStr != null) {
                            try {
                              final date = DateTime.parse(testDateStr).toLocal();
                              final today = DateTime.now();
                              if (date.isAfter(today)) {
                                isFuture = true;
                              }
                              formattedDate = DateFormat(
                                'dd MMM yyyy, hh:mm a',
                              ).format(date);
                            } catch (_) {}
                          }

                          return _ActiveTestCard(
                            test: test,
                            dateStr: formattedDate,
                            isFuture: isFuture,
                            onStart: isFuture
                                ? null
                                : () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          StudentActiveQuizScreen(test: test),
                                    ),
                                  ).then((_) => ref.invalidate(studentTestsProvider)),
                          );
                        },
                      ),
              ),

              // ── Missed ───────────────────────────────────────────────────
              RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(studentTestsProvider);
                  ref.invalidate(studentUnreadNotificationCountProvider);
                },
                child: missedTests.isEmpty
                    ? const _EmptyState(
                        icon: Icons.check_circle_outline,
                        message: 'Great job! You have not missed any tests.',
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        itemCount: missedTests.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final test = missedTests[index] as Map<String, dynamic>;
                          final testDateStr = test['testDate'] as String?;
                          String formattedDate = 'No Date';
                          if (testDateStr != null) {
                            try {
                              final date = DateTime.parse(testDateStr).toLocal();
                              formattedDate = DateFormat(
                                'dd MMM yyyy, hh:mm a',
                              ).format(date);
                            } catch (_) {}
                          }

                          return _MissedTestCard(
                            test: test,
                            dateStr: formattedDate,
                          );
                        },
                      ),
              ),

              // ── Completed ─────────────────────────────────────────────────
              RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(studentTestsProvider);
                  ref.invalidate(studentUnreadNotificationCountProvider);
                },
                child: completedTests.isEmpty
                    ? const _EmptyState(
                        icon: Icons.assignment_turned_in_outlined,
                        message: 'No completed tests yet.',
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        itemCount: completedTests.length,
                        separatorBuilder: (_, i) => const SizedBox(height: 14),
                        itemBuilder: (context, index) => _CompletedTestCard(
                          test: completedTests[index] as Map<String, dynamic>,
                          onViewResult: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => StudentTestResultScreen(
                                test:
                                    completedTests[index] as Map<String, dynamic>,
                              ),
                            ),
                          ).then((_) => ref.invalidate(studentTestsProvider)),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    ),
  ],
),
);
  }
}

// ─── Active Test Card ────────────────────────────────────────────────────────
class _ActiveTestCard extends StatelessWidget {
  final Map<String, dynamic> test;
  final String dateStr;
  final bool isFuture;
  final VoidCallback? onStart;

  const _ActiveTestCard({
    required this.test,
    required this.dateStr,
    required this.isFuture,
    this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    final validUntilRaw = test['validUntil'] ?? test['valid_until'];
    String? deadlineStr;
    if (validUntilRaw != null) {
      try {
        final d = DateTime.parse(validUntilRaw.toString()).toLocal();
        deadlineStr = DateFormat('dd MMM, hh:mm a').format(d);
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isFuture
                      ? AppColors.warningLight
                      : AppColors.successLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isFuture ? 'UPCOMING' : 'AVAILABLE',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: isFuture ? Colors.orange : AppColors.success,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Spacer(),
              if (test['subject'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.infoLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    test['subject']?.toString() ?? 'General',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.info,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Title
          Text(
            test['title'] as String? ?? 'Test',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 10),
          // Details row
          Row(
            children: [
              const Icon(
                Icons.calendar_today_rounded,
                size: 13,
                color: Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(width: 16),
              const Icon(Icons.timer_rounded, size: 13, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                '${test['durationMinutes'] ?? '--'} mins',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(width: 16),
              if (test['isOnline'] == true) ...[
                const Icon(
                  Icons.laptop_chromebook_rounded,
                  size: 13,
                  color: Colors.grey,
                ),
                const SizedBox(width: 4),
                const Text(
                  'Online MCQ',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ] else ...[
                const Icon(
                  Icons.description_rounded,
                  size: 13,
                  color: Colors.grey,
                ),
                const SizedBox(width: 4),
                const Text(
                  'Offline Paper',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ],
          ),
          if (deadlineStr != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.event_busy_rounded,
                  size: 13,
                  color: Colors.amber.shade800,
                ),
                const SizedBox(width: 4),
                Text(
                  'Due: $deadlineStr',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.amber.shade900,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          // Start button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onStart,
              style: ElevatedButton.styleFrom(
                backgroundColor: isFuture
                    ? Colors.grey.shade300
                    : AppColors.primaryDark,
                foregroundColor: isFuture ? Colors.grey.shade600 : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
                elevation: isFuture ? 0 : 2,
              ),
              child: Text(
                isFuture ? 'Starts on $dateStr' : 'Start Test',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Missed Test Card ─────────────────────────────────────────────────────────
class _MissedTestCard extends StatelessWidget {
  final Map<String, dynamic> test;
  final String dateStr;

  const _MissedTestCard({
    required this.test,
    required this.dateStr,
  });

  @override
  Widget build(BuildContext context) {
    final validUntilRaw = test['validUntil'] ?? test['valid_until'];
    String? deadlineStr;
    if (validUntilRaw != null) {
      try {
        final d = DateTime.parse(validUntilRaw.toString()).toLocal();
        deadlineStr = DateFormat('dd MMM, hh:mm a').format(d);
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'MISSED',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Spacer(),
              if (test['subject'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    test['subject']?.toString() ?? 'General',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Title
          Text(
            test['title'] as String? ?? 'Test',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 10),
          // Details row
          Row(
            children: [
              const Icon(
                Icons.calendar_today_rounded,
                size: 13,
                color: Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(width: 16),
              const Icon(Icons.timer_rounded, size: 13, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                '${test['durationMinutes'] ?? '--'} mins',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(width: 16),
              if (test['isOnline'] == true) ...[
                const Icon(
                  Icons.laptop_chromebook_rounded,
                  size: 13,
                  color: Colors.grey,
                ),
                const SizedBox(width: 4),
                const Text(
                  'Online MCQ',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ] else ...[
                const Icon(
                  Icons.description_rounded,
                  size: 13,
                  color: Colors.grey,
                ),
                const SizedBox(width: 4),
                const Text(
                  'Offline Paper',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),
          // Window closed indicator banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.errorLight.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.errorLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.cancel_outlined,
                  size: 15,
                  color: AppColors.error,
                ),
                const SizedBox(width: 6),
                Text(
                  deadlineStr != null
                      ? 'Deadline Passed ($deadlineStr)'
                      : 'Submission Window Closed',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.error,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Completed Test Card ─────────────────────────────────────────────────────
class _CompletedTestCard extends StatelessWidget {
  final Map<String, dynamic> test;
  final VoidCallback onViewResult;
  const _CompletedTestCard({required this.test, required this.onViewResult});

  @override
  Widget build(BuildContext context) {
    final marks = (test['marksObtained'] as num?)?.toInt() ?? 0;
    final max = (test['maxMarks'] ?? test['max_marks'] as num?)?.toInt() ?? 1;
    final pct = (marks / (max > 0 ? max : 1) * 100).toInt();
    final scoreColor = pct >= 75
        ? AppColors.success
        : pct >= 50
        ? Colors.orange
        : AppColors.error;

    String formattedDate = 'No Date';
    if (test['testDate'] != null) {
      try {
        formattedDate = DateFormat(
          'dd MMM yyyy',
        ).format(DateTime.parse(test['testDate']).toLocal());
      } catch (_) {}
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          // Score circle
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: scoreColor, width: 3),
              color: scoreColor.withValues(alpha: 0.1),
            ),
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$marks',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: scoreColor,
                    height: 1,
                  ),
                ),
                Text(
                  '/$max',
                  style: TextStyle(
                    fontSize: 10,
                    color: scoreColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (test['subject'] != null)
                  Text(
                    test['subject'] as String,
                    style: const TextStyle(
                      color: AppColors.info,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                const SizedBox(height: 2),
                Text(
                  test['title'] as String? ?? 'Test',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      size: 12,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Completed on $formattedDate',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: onViewResult,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.infoLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                'Analysis',
                style: TextStyle(
                  color: AppColors.info,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: constraints.maxHeight > 0 ? constraints.maxHeight : 300,
            ),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 64, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    Text(
                      message,
                      style: const TextStyle(color: Colors.grey, fontSize: 14),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
