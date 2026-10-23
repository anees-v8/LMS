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
                  final startRaw = c['startTime']?.toString() ?? '';
                  final endRaw = c['endTime']?.toString() ?? '';
                  final startDt = _parseTimeToToday(startRaw);
                  final endDt = _parseTimeToToday(endRaw);
                  final now = DateTime.now();

                  final bool isLive = startDt != null &&
                      endDt != null &&
                      now.isAfter(startDt.subtract(const Duration(minutes: 5))) &&
                      now.isBefore(endDt.add(const Duration(minutes: 15)));

                  final bool isUpcoming = startDt != null &&
                      now.isBefore(startDt.subtract(const Duration(minutes: 5)));

                  final bool isPast = endDt != null &&
                      now.isAfter(endDt.add(const Duration(minutes: 15)));

                  final bool isAttendanceMarked = c['isAttendanceMarked'] == true;

                  final formattedTime = (startRaw.isNotEmpty && endRaw.isNotEmpty)
                      ? '${_formatTime12h(startRaw)} - ${_formatTime12h(endRaw)}'
                      : (c['startTime'] != null ? '${c['startTime']} - ${c['endTime']}' : 'Time not set');

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildScheduleCard(
                      context,
                      ref: ref,
                      time: formattedTime,
                      batchName: c['batch'] ?? 'Unknown Batch',
                      subject: c['subject'] ?? 'General',
                      subjectId: c['subjectId'] ?? 0,
                      isLive: isLive,
                      isUpcoming: isUpcoming,
                      isPast: isPast,
                      batchId: c['batchId'] ?? 0,
                      batchScheduleId: c['batchScheduleId'] ?? 0,
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

  DateTime? _parseTimeToToday(String? timeStr) {
    if (timeStr == null || timeStr.trim().isEmpty) return null;
    try {
      final trimmed = timeStr.trim().toUpperCase();
      final isPM = trimmed.contains('PM');
      final isAM = trimmed.contains('AM');
      final clean = trimmed.replaceAll('AM', '').replaceAll('PM', '').trim();
      final parts = clean.split(':');
      if (parts.isEmpty) return null;
      int hour = int.parse(parts[0].trim());
      int minute = parts.length > 1 ? int.parse(parts[1].trim()) : 0;
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour == 12) hour = 0;
      final now = DateTime.now();
      return DateTime(now.year, now.month, now.day, hour, minute);
    } catch (_) {
      return null;
    }
  }

  String _formatTime12h(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '';
    final dt = _parseTimeToToday(timeStr);
    if (dt == null) return timeStr;
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  Widget _buildScheduleCard(
    BuildContext context, {
    required WidgetRef ref,
    required String time,
    required String batchName,
    required String subject,
    required int subjectId,
    required bool isLive,
    required bool isUpcoming,
    required bool isPast,
    required int batchId,
    required int batchScheduleId,
    required bool isAttendanceMarked,
  }) {
    Color borderColor;
    Color topBarColor;
    if (isLive) {
      borderColor = AppColors.primary.withValues(alpha: 0.35);
      topBarColor = AppColors.primary.withValues(alpha: 0.05);
    } else if (isPast && !isAttendanceMarked) {
      borderColor = AppColors.error.withValues(alpha: 0.3);
      topBarColor = AppColors.error.withValues(alpha: 0.05);
    } else if (isPast && isAttendanceMarked) {
      borderColor = AppColors.success.withValues(alpha: 0.3);
      topBarColor = AppColors.success.withValues(alpha: 0.05);
    } else {
      borderColor = Colors.grey.shade200;
      topBarColor = Colors.grey.shade50;
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
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
              color: topBarColor,
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
                  color: isLive
                      ? AppColors.primary
                      : (isPast && !isAttendanceMarked
                          ? AppColors.error
                          : Colors.grey.shade600),
                ),
                const SizedBox(width: 8),
                Text(
                  time,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isLive
                        ? AppColors.primary
                        : (isPast && !isAttendanceMarked
                            ? AppColors.error
                            : Colors.grey.shade700),
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
                      color: AppColors.success.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
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
                else if (isPast && isAttendanceMarked)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.check_circle_outline, size: 12, color: AppColors.success),
                        SizedBox(width: 4),
                        Text(
                          'Completed',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  )
                else if (isPast && !isAttendanceMarked)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.warning_amber_rounded, size: 12, color: AppColors.error),
                        SizedBox(width: 4),
                        Text(
                          'Missed',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.error,
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
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w600,
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

                if (isPast && !isAttendanceMarked) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Lecture ended without attendance recorded.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.error.withValues(alpha: 0.85),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],

                if (isLive) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: CustomButton(
                      text: isAttendanceMarked
                          ? 'Attendance Marked ✓'
                          : 'Mark Attendance',
                      backgroundColor: isAttendanceMarked
                          ? AppColors.success
                          : null,
                      onPressed: isAttendanceMarked
                          ? () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Row(
                                    children: [
                                      Icon(
                                        Icons.check_circle_rounded,
                                        color: Colors.white,
                                        size: 20,
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                        'Attendance already marked for this class',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  backgroundColor: AppColors.success,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                            }
                          : () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => TeacherAttendanceScreen(
                                    batchId: batchId,
                                    batchName: batchName,
                                    subjectId: subjectId,
                                    subjectName: subject,
                                    batchScheduleId: batchScheduleId,
                                    isAlreadyMarked: false,
                                  ),
                                ),
                              ).then((_) {
                                ref.invalidate(todayScheduleProvider);
                              });
                            },
                    ),
                  ),
                ] else if (isPast && !isAttendanceMarked) ...[
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.history_rounded, size: 18),
                      label: const Text(
                        'Mark Late Attendance',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: BorderSide(color: AppColors.error.withValues(alpha: 0.5)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => TeacherAttendanceScreen(
                              batchId: batchId,
                              batchName: batchName,
                              subjectId: subjectId,
                              subjectName: subject,
                              batchScheduleId: batchScheduleId,
                            ),
                          ),
                        ).then((_) {
                          ref.invalidate(todayScheduleProvider);
                        });
                      },
                    ),
                  ),
                ] else if (isPast && isAttendanceMarked) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Attendance recorded for this class',
                            style: TextStyle(
                              color: AppColors.success,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
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
