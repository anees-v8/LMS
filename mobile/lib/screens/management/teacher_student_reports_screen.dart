import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_dropdown.dart';
import 'student_report_screen.dart';

class TeacherStudentReportsScreen extends ConsumerStatefulWidget {
  const TeacherStudentReportsScreen({super.key});

  @override
  ConsumerState<TeacherStudentReportsScreen> createState() =>
      _TeacherStudentReportsScreenState();
}

class _TeacherStudentReportsScreenState
    extends ConsumerState<TeacherStudentReportsScreen> {
  int? _selectedBatchId;

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(myBatchesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Student Reports',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: batchesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text(friendlyErrorMessage(e)),
              data: (batches) {
                if (batches.isEmpty) return const Text('No batches assigned');

                // Set initial selection
                if (_selectedBatchId == null && batches.isNotEmpty) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    setState(() => _selectedBatchId = batches.first['id']);
                  });
                }

                return CustomDropdown<int?>(
                  label: 'Batch',
                  hint: 'Select Batch',
                  value: _selectedBatchId,
                  options: batches.map<DropdownOption<int?>>((b) {
                    return DropdownOption<int?>(
                      value: b['id'],
                      label: b['name'],
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() => _selectedBatchId = val);
                  },
                );
              },
            ),
          ),
          Expanded(
            child: _selectedBatchId == null
                ? const Center(child: Text('Please select a batch'))
                : _buildStudentList(context, ref, _selectedBatchId!),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentList(BuildContext context, WidgetRef ref, int batchId) {
    final studentsAsync = ref.watch(batchStudentsProvider(batchId));

    return studentsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text(friendlyErrorMessage(err))),
      data: (students) {
        if (students.isEmpty)
          return const Center(child: Text('No students in this batch.'));

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: students.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final s = students[index];
            final studentId = s['studentId'] as int;
            return InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Consumer(
                      builder: (context, ref, _) => StudentReportScreen(
                        student: {
                          'id': studentId,
                          'fullName': s['name'],
                          'rollNo': s['rollNo'],
                        },
                        detailsAsync: ref.watch(
                          teacherStudentDetailsProvider(studentId),
                        ),
                      ),
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
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                      child: Text(
                        (s['name'] ?? '?')[0].toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s['name'] ?? 'Unknown',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            s['email'] ?? '',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'View Report',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
