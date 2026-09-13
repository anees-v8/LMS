import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_dropdown.dart';
import 'quiz_editor_screen.dart';

class TeacherManageTestsScreen extends ConsumerWidget {
  const TeacherManageTestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 160),
            itemCount: tests.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final test = tests[index];
              final isOnline = test['is_online'] == true;
              final duration = test['duration_minutes'];
              final questionCount =
                  int.tryParse(test['question_count']?.toString() ?? '0') ?? 0;
              // .toLocal() matters here: test_date comes back as a UTC ISO
              // string (e.g. '...T08:30:00.000Z'); without converting, this
              // would display the UTC time instead of the device's local
              // (IST) time — off by 5.5 hours.
              final dateStr = test['test_date'] != null
                  ? DateFormat(
                      'dd MMM yyyy, hh:mm a',
                    ).format(DateTime.parse(test['test_date']).toLocal())
                  : 'No Date';
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
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: isOnline
                                  ? Colors.blue.shade50
                                  : Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              isOnline ? 'Online MCQ' : 'Offline',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isOnline ? Colors.blue : Colors.orange,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Batch: ${test['batch_name'] ?? 'All'} | Subject: ${test['subject_name'] ?? 'General'}',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 14,
                            color: Colors.grey.shade500,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            dateStr,
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Icon(
                            Icons.timer,
                            size: 14,
                            color: Colors.grey.shade500,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            duration != null ? '$duration mins' : 'Untimed',
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                          const Spacer(),
                          if (maxMarks != null && maxMarks != 0)
                            Text(
                              '${maxMarks}M | ',
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                color: Colors.grey,
                              ),
                            ),
                          Text(
                            '$questionCount Qs',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateTestModal(context, ref),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Create Quiz', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  void _showCreateTestModal(BuildContext context, WidgetRef ref) async {
    // The modal pops with the created test's data (see _CreateTestModal._submit)
    // so we can jump straight into its question editor — no extra tap needed.
    final created = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
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

// ─── Dedicated StatefulWidget so it can watch providers cleanly ───────────────
class _CreateTestModal extends ConsumerStatefulWidget {
  final VoidCallback onCreated;
  const _CreateTestModal({required this.onCreated});

  @override
  ConsumerState<_CreateTestModal> createState() => _CreateTestModalState();
}

class _CreateTestModalState extends ConsumerState<_CreateTestModal> {
  final _titleCtrl = TextEditingController();
  final _durationCtrl = TextEditingController();
  final _maxMarksCtrl = TextEditingController();
  bool _isOnline = true;
  int? _selectedBatchId;
  int? _selectedSubjectId;
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _durationCtrl.dispose();
    _maxMarksCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? TimeOfDay.now(),
    );
    if (picked != null) setState(() => _selectedTime = picked);
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.isEmpty) return;
    setState(() => _isSubmitting = true);

    try {
      final api = ref.read(apiServiceProvider);
      // Combine date + time (picked in the device's local time — this app
      // is India-only, so that's IST) into one UTC-normalized ISO datetime
      // string. The backend stores this in a TIMESTAMPTZ column with no
      // session timezone override (defaults to UTC) — sending a naive local
      // time with no 'Z' would be misinterpreted as UTC and land 5.5 hours
      // off. `.toUtc()` converts it correctly before sending. Previously
      // only a bare date was sent, which silently defaulted to midnight —
      // that's the bug this fixes. If only a date was picked (no time),
      // default the time to noon rather than midnight so it doesn't look
      // like an overnight test.
      String? testDateTime;
      if (_selectedDate != null) {
        final time = _selectedTime ?? const TimeOfDay(hour: 12, minute: 0);
        final combined = DateTime(
          _selectedDate!.year,
          _selectedDate!.month,
          _selectedDate!.day,
          time.hour,
          time.minute,
        );
        testDateTime = combined.toUtc().toIso8601String();
      }
      final created = await api.post('/teacher/tests', {
        'title': _titleCtrl.text.trim(),
        if (_durationCtrl.text.isNotEmpty)
          'durationMinutes': int.tryParse(_durationCtrl.text),
        if (_maxMarksCtrl.text.isNotEmpty)
          'maxMarks': int.tryParse(_maxMarksCtrl.text),
        if (_selectedBatchId != null) 'batchId': _selectedBatchId,
        if (_selectedSubjectId != null) 'subjectId': _selectedSubjectId,
        if (testDateTime != null) 'testDate': testDateTime,
        'isOnline': _isOnline,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context, created as Map<String, dynamic>);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyErrorMessage(e)),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(myBatchesProvider);
    final subjectsAsync = ref.watch(teacherSubjectsProvider);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle — consistent with every other bottom sheet in the app.
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
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Title
            TextField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                labelText: 'Quiz Title *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),

            // Batch dropdown
            batchesAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox(),
              data: (batches) => CustomDropdown<int?>(
                label: 'Batch (Optional)',
                hint: 'All Batches',
                value: _selectedBatchId,
                options: [
                  const DropdownOption<int?>(
                    value: null,
                    label: 'All Batches',
                  ),
                  ...batches.map(
                    (b) => DropdownOption<int?>(
                      value: b['id'] as int,
                      label: b['name'] ?? '',
                    ),
                  ),
                ],
                onChanged: (val) => setState(() => _selectedBatchId = val),
              ),
            ),
            const SizedBox(height: 14),

            // Subject dropdown
            subjectsAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox(),
              data: (subjects) => CustomDropdown<int?>(
                label: 'Subject (Optional)',
                hint: 'General',
                value: _selectedSubjectId,
                options: [
                  const DropdownOption<int?>(value: null, label: 'General'),
                  ...subjects.map(
                    (s) => DropdownOption<int?>(
                      value: s['id'] as int,
                      label: s['name'] ?? '',
                    ),
                  ),
                ],
                onChanged: (val) => setState(() => _selectedSubjectId = val),
              ),
            ),
            const SizedBox(height: 14),

            // Date & time pickers
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _pickDate,
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Test Date (Optional)',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today, size: 18),
                      ),
                      child: Text(
                        _selectedDate != null
                            ? DateFormat('dd MMM yyyy').format(_selectedDate!)
                            : 'Select Date',
                        style: TextStyle(
                          color: _selectedDate != null
                              ? Colors.black87
                              : Colors.grey.shade500,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _pickTime,
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Time (Optional)',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.access_time, size: 18),
                      ),
                      child: Text(
                        _selectedTime != null
                            ? _selectedTime!.format(context)
                            : 'Select Time',
                        style: TextStyle(
                          color: _selectedTime != null
                              ? Colors.black87
                              : Colors.grey.shade500,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Duration & Max Marks row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _durationCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Duration (mins)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _maxMarksCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Max Marks',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Online switch
            SwitchListTile(
              title: const Text('Is Online MCQ Quiz?'),
              subtitle: const Text('If off, acts as offline test record.'),
              value: _isOnline,
              onChanged: (val) => setState(() => _isOnline = val),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 16),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
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
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
