import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_dropdown.dart';
import '../../utils/app_toast.dart';
import 'quiz_editor_screen.dart';
import 'teacher_test_submissions_screen.dart';

enum TestStatus {
  active,
  upcoming,
  completed,
}

TestStatus getTestStatus(Map<String, dynamic> test) {
  final now = DateTime.now();
  final rawTestDate = test['test_date'] ?? test['scheduled_at'];
  final rawValidUntil = test['valid_until'] ?? test['validUntil'];
  final duration = int.tryParse(test['duration_minutes']?.toString() ?? '');

  DateTime? scheduledAt;
  if (rawTestDate != null) {
    scheduledAt = DateTime.tryParse(rawTestDate)?.toLocal();
  }

  DateTime? deadline;
  if (rawValidUntil != null) {
    deadline = DateTime.tryParse(rawValidUntil)?.toLocal();
  } else if (scheduledAt != null) {
    if (duration != null && duration > 0) {
      deadline = scheduledAt.add(Duration(minutes: duration));
    } else {
      deadline = scheduledAt.add(const Duration(hours: 24));
    }
  }

  if (deadline != null && now.isAfter(deadline)) {
    return TestStatus.completed;
  }
  if (scheduledAt != null && now.isBefore(scheduledAt)) {
    return TestStatus.upcoming;
  }
  return TestStatus.active;
}

class TeacherManageTestsScreen extends ConsumerStatefulWidget {
  const TeacherManageTestsScreen({super.key});

  @override
  ConsumerState<TeacherManageTestsScreen> createState() =>
      _TeacherManageTestsScreenState();
}

class _TeacherManageTestsScreenState
    extends ConsumerState<TeacherManageTestsScreen> {
  String _selectedFilter = 'all'; // 'all', 'active', 'upcoming', 'completed'

  @override
  Widget build(BuildContext context) {
    final testsAsync = ref.watch(testsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Manage Quizzes & Tests',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: testsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text(friendlyErrorMessage(err))),
        data: (tests) {
          if (tests.isEmpty) {
            return const Center(
              child: Text(
                'No tests created yet. Tap + to create one.',
                style: TextStyle(color: Colors.grey),
              ),
            );
          }

          // Count tests by status
          final activeCount = tests
              .where(
                (t) =>
                    getTestStatus(t as Map<String, dynamic>) ==
                    TestStatus.active,
              )
              .length;
          final upcomingCount = tests
              .where(
                (t) =>
                    getTestStatus(t as Map<String, dynamic>) ==
                    TestStatus.upcoming,
              )
              .length;
          final completedCount = tests
              .where(
                (t) =>
                    getTestStatus(t as Map<String, dynamic>) ==
                    TestStatus.completed,
              )
              .length;

          // Filter tests
          final filtered = tests.where((t) {
            if (_selectedFilter == 'all') return true;
            final status = getTestStatus(t as Map<String, dynamic>);
            return status.name == _selectedFilter;
          }).toList();

          // Sort tests: Active first, then Upcoming (earliest first), then Completed (latest first)
          filtered.sort((a, b) {
            final testA = a as Map<String, dynamic>;
            final testB = b as Map<String, dynamic>;
            final statusA = getTestStatus(testA);
            final statusB = getTestStatus(testB);

            if (statusA != statusB) {
              return statusA.index.compareTo(statusB.index);
            }

            final dateA = DateTime.tryParse(
              testA['test_date'] ?? testA['scheduled_at'] ?? '',
            );
            final dateB = DateTime.tryParse(
              testB['test_date'] ?? testB['scheduled_at'] ?? '',
            );

            if (dateA == null || dateB == null) return 0;
            if (statusA == TestStatus.upcoming) {
              return dateA.compareTo(dateB); // soonest first
            }
            return dateB.compareTo(dateA); // most recent first
          });

          return Column(
            children: [
              // ── Status Filter Bar ─────────────────────────────────
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(
                        id: 'all',
                        label: 'All',
                        count: tests.length,
                        activeColor: AppColors.primaryDark,
                      ),
                      const SizedBox(width: 8),
                      _buildFilterChip(
                        id: 'active',
                        label: 'Active',
                        count: activeCount,
                        activeColor: const Color(0xFF2E7D32),
                        dotColor: const Color(0xFF2E7D32),
                      ),
                      const SizedBox(width: 8),
                      _buildFilterChip(
                        id: 'upcoming',
                        label: 'Upcoming',
                        count: upcomingCount,
                        activeColor: const Color(0xFF1565C0),
                        dotColor: const Color(0xFF1565C0),
                      ),
                      const SizedBox(width: 8),
                      _buildFilterChip(
                        id: 'completed',
                        label: 'Completed',
                        count: completedCount,
                        activeColor: const Color(0xFF616161),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(height: 1, thickness: 0.8),

              // ── Tests List ─────────────────────────────────────────
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          _getEmptyFilterMessage(),
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 14,
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () async => ref.invalidate(testsProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
                          itemCount: filtered.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final test = filtered[index];
                            return _buildTestCard(test);
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateTestModal(context, ref),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text(
          'Create Quiz',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  String _getEmptyFilterMessage() {
    switch (_selectedFilter) {
      case 'active':
        return 'No active tests right now.';
      case 'upcoming':
        return 'No upcoming tests scheduled.';
      case 'completed':
        return 'No completed tests yet.';
      default:
        return 'No tests found.';
    }
  }

  Widget _buildFilterChip({
    required String id,
    required String label,
    required int count,
    required Color activeColor,
    Color? dotColor,
  }) {
    final isSelected = _selectedFilter == id;

    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = id),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : const Color(0xFFF1F4F2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : Colors.grey.shade300,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (dotColor != null && !isSelected) ...[
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? Colors.white : Colors.grey.shade800,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.25)
                    : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : Colors.grey.shade700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestCard(Map<String, dynamic> test) {
    final status = getTestStatus(test);
    final isOnline = test['is_online'] == true;
    final duration = test['duration_minutes'];
    final questionCount =
        int.tryParse(test['question_count']?.toString() ?? '0') ?? 0;

    final dateStr = test['test_date'] != null
        ? DateFormat(
            'dd MMM yyyy, hh:mm a',
          ).format(DateTime.parse(test['test_date']).toLocal())
        : 'No Date';

    final rawValidUntil = test['valid_until'] ?? test['validUntil'];
    final validUntilStr = rawValidUntil != null
        ? DateFormat(
            'dd MMM yyyy, hh:mm a',
          ).format(DateTime.parse(rawValidUntil).toLocal())
        : null;

    final maxMarks = test['max_marks'];

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => QuizEditorScreen(
              testId: test['id'],
              testTitle: test['title'],
            ),
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: status == TestStatus.active
                ? const Color(0xFF81C784).withValues(alpha: 0.6)
                : Colors.grey.shade200,
            width: status == TestStatus.active ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: status == TestStatus.active
                  ? const Color(0xFF4CAF50).withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.02),
              blurRadius: status == TestStatus.active ? 8 : 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Title + Status Badges ───────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    test['title'] ?? 'Untitled',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 8),

            // ── Batch & Subject Info ────────────────────────────
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Batch: ${test['batch_name'] ?? 'All'} | Subject: ${test['subject_name'] ?? 'General'}',
                    style: TextStyle(
                      color: Colors.grey.shade700,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: isOnline
                        ? Colors.blue.shade50
                        : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isOnline ? 'Online MCQ' : 'Offline',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isOnline ? Colors.blue.shade700 : Colors.orange.shade800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // ── Timing & Questions Row ──────────────────────────
            Row(
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  size: 13.5,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 5),
                Text(
                  dateStr,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 14),
                Icon(
                  Icons.timer_outlined,
                  size: 14,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 4),
                Text(
                  duration != null ? '$duration mins' : 'Untimed',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                if (maxMarks != null && maxMarks != 0)
                  Text(
                    '${maxMarks}M | ',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade600,
                      fontSize: 12,
                    ),
                  ),
                Text(
                  '$questionCount Qs',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),

            // ── Deadline Display ────────────────────────────────
            if (validUntilStr != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: status == TestStatus.completed
                      ? Colors.grey.shade100
                      : const Color(0xFFFFF8E1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      status == TestStatus.completed
                          ? Icons.check_circle_outline
                          : Icons.event_busy_rounded,
                      size: 13,
                      color: status == TestStatus.completed
                          ? Colors.grey.shade600
                          : Colors.amber.shade900,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      status == TestStatus.completed
                          ? 'Ended: $validUntilStr'
                          : 'Deadline: $validUntilStr',
                      style: TextStyle(
                        color: status == TestStatus.completed
                            ? Colors.grey.shade700
                            : Colors.amber.shade900,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),
            const Divider(height: 1, thickness: 0.6),
            const SizedBox(height: 10),

            // ── Action Buttons ──────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => QuizEditorScreen(
                            testId: test['id'],
                            testTitle: test['title'],
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.edit_note_rounded, size: 16),
                    label: const Text(
                      'Questions',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(
                        color: AppColors.primary.withValues(alpha: 0.3),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => TeacherTestSubmissionsScreen(
                            testId: test['id'],
                            testTitle: test['title'],
                          ),
                        ),
                      );
                    },
                    icon: const Icon(
                      Icons.people_alt_outlined,
                      size: 15,
                    ),
                    label: const Text(
                      'Submissions',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(TestStatus status) {
    switch (status) {
      case TestStatus.active:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F5E9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFF81C784), width: 0.8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Color(0xFF2E7D32),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 5),
              const Text(
                'LIVE NOW',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2E7D32),
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
        );
      case TestStatus.upcoming:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFFE3F2FD),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFF90CAF9), width: 0.8),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.schedule_rounded,
                size: 11,
                color: Color(0xFF1565C0),
              ),
              SizedBox(width: 4),
              Text(
                'UPCOMING',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1565C0),
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
        );
      case TestStatus.completed:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFFEEEEEE),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE0E0E0), width: 0.8),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.check_circle_outline_rounded,
                size: 11,
                color: Color(0xFF616161),
              ),
              SizedBox(width: 4),
              Text(
                'COMPLETED',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF616161),
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
        );
    }
  }

  void _showCreateTestModal(BuildContext context, WidgetRef ref) async {
    final created = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) =>
          _CreateTestModal(onCreated: () => ref.invalidate(testsProvider)),
    );
    if (created != null && context.mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => QuizEditorScreen(
            testId: created['id'] as int,
            testTitle: created['title'] as String? ?? 'Quiz',
            autoOpenAddQuestion: true,
          ),
        ),
      );
    }
  }
}

// ─── Create Test Modal with Smart Prefill and Unified Pickers ─────────────────
class _CreateTestModal extends ConsumerStatefulWidget {
  final VoidCallback onCreated;
  const _CreateTestModal({required this.onCreated});

  @override
  ConsumerState<_CreateTestModal> createState() => _CreateTestModalState();
}

class _CreateTestModalState extends ConsumerState<_CreateTestModal> {
  final _titleCtrl = TextEditingController();
  final _durationCtrl = TextEditingController(text: '30');
  final _maxMarksCtrl = TextEditingController();
  bool _isOnline = true;
  int? _selectedBatchId;
  int? _selectedSubjectId;

  late DateTime _startDateTime;
  late DateTime _deadlineDateTime;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Round initial start time to next 5 minutes
    final now = DateTime.now();
    final minuteMod = now.minute % 5;
    final addMinutes = minuteMod == 0 ? 5 : (5 - minuteMod);
    _startDateTime = DateTime(
      now.year,
      now.month,
      now.day,
      now.hour,
      now.minute,
    ).add(Duration(minutes: addMinutes));

    // Default deadline to Start Time + 30 minutes (never midnight 11:59 PM)
    _deadlineDateTime = _startDateTime.add(const Duration(minutes: 30));

    // Keep deadline in sync when duration is adjusted
    _durationCtrl.addListener(_onDurationChanged);
  }

  void _onDurationChanged() {
    final duration = int.tryParse(_durationCtrl.text.trim());
    if (duration != null && duration > 0 && mounted) {
      setState(() {
        _deadlineDateTime = _startDateTime.add(Duration(minutes: duration));
      });
    }
  }

  @override
  void dispose() {
    _durationCtrl.removeListener(_onDurationChanged);
    _titleCtrl.dispose();
    _durationCtrl.dispose();
    _maxMarksCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickStartDateTime() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _startDateTime,
      firstDate: DateTime(2024),
      lastDate: DateTime(2035),
    );
    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_startDateTime),
    );
    if (pickedTime == null || !mounted) return;

    final newStart = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    setState(() {
      _startDateTime = newStart;
      final duration = int.tryParse(_durationCtrl.text.trim());
      final addMins = (duration != null && duration > 0) ? duration : 30;
      _deadlineDateTime = newStart.add(Duration(minutes: addMins));
    });
  }

  Future<void> _pickDeadlineDateTime() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _deadlineDateTime,
      firstDate: DateTime(2024),
      lastDate: DateTime(2035),
    );
    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_deadlineDateTime),
    );
    if (pickedTime == null || !mounted) return;

    final newDeadline = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    if (newDeadline.isBefore(_startDateTime)) {
      AppToast.showError(context, 'Deadline cannot be before start time');
      return;
    }

    setState(() {
      _deadlineDateTime = newDeadline;
    });
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      AppToast.showError(context, 'Please enter a quiz title');
      return;
    }
    if (_selectedBatchId == null) {
      AppToast.showError(context, 'Please select a batch');
      return;
    }
    if (_selectedSubjectId == null) {
      AppToast.showError(context, 'Please select a subject');
      return;
    }
    if (_deadlineDateTime.isBefore(_startDateTime)) {
      AppToast.showError(context, 'Deadline must be after start time');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final api = ref.read(apiServiceProvider);
      final testDateTime = _startDateTime.toUtc().toIso8601String();
      final deadlineDateTime = _deadlineDateTime.toUtc().toIso8601String();

      final created = await api.post('/teacher/tests', {
        'title': title,
        if (_durationCtrl.text.isNotEmpty)
          'durationMinutes': int.tryParse(_durationCtrl.text),
        if (_maxMarksCtrl.text.isNotEmpty)
          'maxMarks': int.tryParse(_maxMarksCtrl.text),
        'batchId': _selectedBatchId,
        'subjectId': _selectedSubjectId,
        'testDate': testDateTime,
        'validUntil': deadlineDateTime,
        'isOnline': _isOnline,
      });

      widget.onCreated();
      if (mounted) {
        final nav = Navigator.of(context, rootNavigator: true);
        if (nav.canPop()) nav.pop(created as Map<String, dynamic>);
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(context, friendlyErrorMessage(e));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(myBatchesProvider);
    final subjectsAsync = _selectedBatchId != null
        ? ref.watch(teacherBatchSubjectsProvider(_selectedBatchId!))
        : null;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 20,
        right: 20,
        top: 14,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Drag Handle ─────────────────────────────────────────
            Center(
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                height: 4,
                width: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Create New Quiz',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
                IconButton(
                  onPressed: () {
                    final nav = Navigator.of(context, rootNavigator: true);
                    if (nav.canPop()) nav.pop();
                  },
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Title ───────────────────────────────────────────────
            TextField(
              controller: _titleCtrl,
              decoration: InputDecoration(
                labelText: 'Quiz Title *',
                hintText: 'e.g. Chapter 3: Organic Chemistry Quiz',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
              ),
            ),
            const SizedBox(height: 14),

            // ── Batch Dropdown (Only Assigned Batches) ──────────────
            batchesAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (err, stack) => const SizedBox(),
              data: (batches) {
                // Auto-select if only 1 batch assigned
                if (_selectedBatchId == null && batches.length == 1) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted && _selectedBatchId == null) {
                      setState(() {
                        _selectedBatchId = batches.first['id'] as int;
                      });
                    }
                  });
                }

                return CustomDropdown<int?>(
                  label: 'Batch *',
                  hint: 'Select Batch',
                  value: _selectedBatchId,
                  options: batches.map(
                    (b) => DropdownOption<int?>(
                      value: b['id'] as int,
                      label: b['name'] ?? '',
                    ),
                  ).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedBatchId = val;
                      _selectedSubjectId = null; // reset subject on batch switch
                    });
                  },
                );
              },
            ),
            const SizedBox(height: 14),

            // ── Subject Dropdown (Dynamic & Smart Pre-filled) ────────
            if (_selectedBatchId == null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: const Text(
                  'Select a batch first to choose subject',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              )
            else
              subjectsAsync!.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: LinearProgressIndicator(),
                ),
                error: (err, stack) => const Text(
                  'Could not load subjects for this batch',
                  style: TextStyle(color: AppColors.error, fontSize: 12),
                ),
                data: (subjects) {
                  if (subjects.isEmpty) {
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.amber.shade200),
                      ),
                      child: const Text(
                        'You are not assigned to teach any subject in this batch.',
                        style: TextStyle(
                          color: Colors.brown,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    );
                  }

                  // Smart Pre-fill: If teacher teaches only 1 subject in this batch, auto-select it!
                  if (_selectedSubjectId == null && subjects.length == 1) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted && _selectedSubjectId == null) {
                        setState(() {
                          _selectedSubjectId = subjects.first['id'] as int;
                        });
                      }
                    });
                  }

                  return CustomDropdown<int?>(
                    label: 'Subject *',
                    hint: 'Select Subject',
                    value: _selectedSubjectId,
                    options: subjects.map(
                      (s) => DropdownOption<int?>(
                        value: s['id'] as int,
                        label: s['name'] ?? '',
                      ),
                    ).toList(),
                    onChanged: (val) =>
                        setState(() => _selectedSubjectId = val),
                  );
                },
              ),
            const SizedBox(height: 16),

            // ── Unified Timing Pickers (Starts & Deadline +30m) ─────
            const Text(
              'Schedule & Validity',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildDateTimeBox(
                    label: 'Starts At',
                    dateTime: _startDateTime,
                    icon: Icons.play_circle_outline_rounded,
                    iconColor: AppColors.primary,
                    onTap: _pickStartDateTime,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildDateTimeBox(
                    label: 'Deadline (Ends)',
                    dateTime: _deadlineDateTime,
                    icon: Icons.timer_outlined,
                    iconColor: Colors.amber.shade800,
                    onTap: _pickDeadlineDateTime,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ── Duration & Max Marks row ────────────────────────────
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _durationCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Duration (mins)',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 14,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _maxMarksCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Max Marks',
                      hintText: 'e.g. 25',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // ── Online MCQ Switch ───────────────────────────────────
            SwitchListTile(
              title: const Text(
                'Is Online MCQ Quiz?',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'If off, acts as offline test record.',
                style: TextStyle(fontSize: 12),
              ),
              value: _isOnline,
              activeThumbColor: AppColors.primary,
              onChanged: (val) => setState(() => _isOnline = val),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 14),

            // ── Submit Button ───────────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Create Quiz',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDateTimeBox({
    required String label,
    required DateTime dateTime,
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    final dateStr = DateFormat('dd MMM').format(dateTime);
    final timeStr = DateFormat('hh:mm a').format(dateTime);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 14, color: iconColor),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '$dateStr, $timeStr',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryDark,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
