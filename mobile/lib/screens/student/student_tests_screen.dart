import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'student_active_quiz_screen.dart';
import 'student_test_result_screen.dart';

import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

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
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final testsAsync = ref.watch(studentTestsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        title: const Text(
          'Assessments',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFA87D26),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
          tabs: testsAsync.when(
            data: (data) {
              final aCount = (data['active'] as List?)?.length ?? 0;
              final cCount = (data['completed'] as List?)?.length ?? 0;
              return [
                Tab(text: 'Active ($aCount)'),
                Tab(text: 'Completed ($cCount)'),
              ];
            },
            loading: () => const [Tab(text: 'Active'), Tab(text: 'Completed')],
            error: (_, err) => const [
              Tab(text: 'Active'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
      ),
      body: testsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text(friendlyErrorMessage(err))),
        data: (data) {
          final activeTests = data['active'] as List? ?? [];
          final completedTests = data['completed'] as List? ?? [];

          return TabBarView(
            controller: _tabController,
            children: [
              // ── Active / Upcoming ─────────────────────────────────────────
              activeTests.isEmpty
                  ? const _EmptyState(
                      icon: Icons.quiz_outlined,
                      message: 'No upcoming tests.',
                    )
                  : ListView.separated(
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
                            // .toLocal(): testDateStr is a UTC ISO string —
                            // reading year/month/day off it directly (as
                            // this used to) reads the UTC calendar date,
                            // which is wrong for anything scheduled late
                            // night/early morning IST (e.g. 1 AM IST is
                            // still the previous day in UTC).
                            final date = DateTime.parse(testDateStr).toLocal();
                            final today = DateTime.now();
                            final midnightToday = DateTime(
                              today.year,
                              today.month,
                              today.day,
                            );
                            final testMidnight = DateTime(
                              date.year,
                              date.month,
                              date.day,
                            );
                            if (testMidnight.isAfter(midnightToday)) {
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
                                ),
                        );
                      },
                    ),

              // ── Completed ─────────────────────────────────────────────────
              completedTests.isEmpty
                  ? const _EmptyState(
                      icon: Icons.assignment_turned_in_outlined,
                      message: 'No completed tests yet.',
                    )
                  : ListView.separated(
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
                        ),
                      ),
                    ),
            ],
          );
        },
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
                    test['subject'] as String,
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

// ─── Completed Test Card ─────────────────────────────────────────────────────
class _CompletedTestCard extends StatelessWidget {
  final Map<String, dynamic> test;
  final VoidCallback onViewResult;
  const _CompletedTestCard({required this.test, required this.onViewResult});

  @override
  Widget build(BuildContext context) {
    final marks = test['marksObtained'] as int? ?? 0;
    final max = test['maxMarks'] as int? ?? 1;
    final pct = (marks / max * 100).toInt();
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
