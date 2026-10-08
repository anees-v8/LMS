import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../custom_button.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../screens/management/teacher_attendance_screen.dart';

class TeacherScheduleList extends ConsumerWidget {
  const TeacherScheduleList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheduleAsync = ref.watch(todayScheduleProvider);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Today\'s Schedule',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
              TextButton(
                onPressed: () {
                  ref.read(teacherShellTabIndexProvider.notifier).setTab(1);
                },
                child: const Text(
                  'View Full Timetable',
                  style: TextStyle(color: AppColors.primary, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          scheduleAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Text(friendlyErrorMessage(err)),
            data: (data) {
              final classes = List<Map<String, dynamic>>.from(
                data['classes'] ?? [],
              );
              if (classes.isEmpty) {
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(
                    child: Text(
                      'No classes scheduled for today',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                );
              }

              return Column(
                children: classes.map((c) {
                  // Basic logic to check if a class is currently live
                  // For simplicity, we just check if it's the first class or we parse time.
                  // Mocking isLive for the demo based on index for now, or just setting all to false unless time matches.
                  // Real implementation would parse startTime/endTime and compare with DateTime.now()
                  final isLive =
                      classes.indexOf(c) ==
                      0; // Just mock the first one as live for demo
                  final isAttendanceMarked = c['isAttendanceMarked'] ?? false;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildScheduleCard(
                      context,
                      ref: ref,
                      time: '${c['startTime']} - ${c['endTime']}',
                      batchName: c['batch'] ?? 'Unknown Batch',
                      subject: c['subject'] ?? 'General',
                      subjectId: c['subjectId'],
                      isLive: isLive,
                      batchId: c['batchId'],
                      batchScheduleId: c['batchScheduleId'],
                      isAttendanceMarked: isAttendanceMarked,
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleCard(
    BuildContext context, {
    required WidgetRef ref,
    required String time,
    required String batchName,
    required String subject,
    required int subjectId,
    required bool isLive,
    required int batchId,
    required int batchScheduleId,
    required bool isAttendanceMarked,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLive
              ? AppColors.primary.withValues(alpha: 0.3)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isLive
                  ? AppColors.primary.withValues(alpha: 0.05)
                  : Colors.grey.shade50,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.access_time,
                  size: 16,
                  color: isLive ? AppColors.primary : Colors.grey.shade600,
                ),
                const SizedBox(width: 8),
                Text(
                  time,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isLive ? AppColors.primary : Colors.grey.shade700,
                  ),
                ),
                const Spacer(),
                if (isLive)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.circle, size: 8, color: AppColors.success),
                        SizedBox(width: 4),
                        Text(
                          'Live Now',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Text(
                    'Upcoming',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  batchName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Subject: $subject',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),

                if (isLive) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: CustomButton(
                      text: isAttendanceMarked
                          ? 'Attendance Marked'
                          : 'Mark Attendance',
                      backgroundColor: isAttendanceMarked
                          ? AppColors.success
                          : null,
                      onPressed: isAttendanceMarked
                          ? () {}
                          : () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => TeacherAttendanceScreen(
                                    batchId: batchId,
                                    batchName: batchName,
                                    subjectId: subjectId,
                                    batchScheduleId: batchScheduleId,
                                  ),
                                ),
                              ).then((_) {
                                // Refresh schedule after returning
                                ref.invalidate(todayScheduleProvider);
                              });
                            },
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
