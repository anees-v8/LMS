import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../management/teacher_attendance_screen.dart';

class TeacherScheduleScreen extends ConsumerStatefulWidget {
  const TeacherScheduleScreen({super.key});

  @override
  ConsumerState<TeacherScheduleScreen> createState() =>
      _TeacherScheduleScreenState();
}

class _TeacherScheduleScreenState extends ConsumerState<TeacherScheduleScreen> {
  DateTime _selectedDate = DateTime.now();
  String _selectedFilter = 'All';
  final List<String> _filters = ['All', 'Upcoming', 'Completed', 'Cancelled'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'My Schedule',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        automaticallyImplyLeading: false, // Removes hamburger/back button
        elevation: 0,
      ),
      body: Column(
        children: [
          _buildCalendarStrip(),
          _buildFilters(),
          Expanded(child: _buildTimelineList()),
        ],
      ),
    );
  }

  Widget _buildCalendarStrip() {
    // Generate dates for the current week starting from Monday
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final dates = List.generate(7, (i) => startOfWeek.add(Duration(days: i)));

    return Container(
      color: AppColors.primaryDark,
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: dates.map((date) {
          final isSelected =
              date.day == _selectedDate.day &&
              date.month == _selectedDate.month;
          final isToday = date.day == now.day && date.month == now.month;

          return GestureDetector(
            onTap: () => setState(() => _selectedDate = date),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: isToday && !isSelected
                    ? Border.all(
                        color: AppColors.primary.withValues(alpha: 0.5),
                      )
                    : null,
              ),
              child: Column(
                children: [
                  Text(
                    DateFormat('E').format(date).toUpperCase(),
                    style: TextStyle(
                      color: isSelected ? Colors.white : Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${date.day}',
                    style: TextStyle(
                      color: isSelected ? Colors.white : Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _filters.map((filter) {
            final isSelected = _selectedFilter == filter;
            return Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: ChoiceChip(
                label: Text(
                  filter,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey.shade700,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
                selected: isSelected,
                selectedColor: AppColors.primary,
                backgroundColor: Colors.grey.shade100,
                side: BorderSide.none,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                onSelected: (val) {
                  if (val) setState(() => _selectedFilter = filter);
                },
              ),
            );
          }).toList(),
        ),
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

  Widget _buildTimelineList() {
    final scheduleAsync = ref.watch(todayScheduleProvider);
    final isToday =
        _selectedDate.day == DateTime.now().day &&
        _selectedDate.month == DateTime.now().month;

    if (!isToday) {
      return Center(
        child: Text(
          'Schedule for ${DateFormat('dd MMM').format(_selectedDate)} not available yet.',
          style: const TextStyle(color: Colors.grey),
        ),
      );
    }

    return scheduleAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text(friendlyErrorMessage(err))),
      data: (data) {
        final classes = List<Map<String, dynamic>>.from(data['classes'] ?? []);

        // Filter based on real timing and attendance status
        final filteredClasses = classes.where((c) {
          final startRaw = c['startTime']?.toString() ?? '';
          final endRaw = c['endTime']?.toString() ?? '';
          final startDt = _parseTimeToToday(startRaw);
          final endDt = _parseTimeToToday(endRaw);
          final now = DateTime.now();

          final isLive = startDt != null &&
              endDt != null &&
              now.isAfter(startDt.subtract(const Duration(minutes: 5))) &&
              now.isBefore(endDt.add(const Duration(minutes: 15)));
          final isUpcoming = startDt != null &&
              now.isBefore(startDt.subtract(const Duration(minutes: 5)));
          final isPast = endDt != null &&
              now.isAfter(endDt.add(const Duration(minutes: 15)));
          final isAttendanceMarked = c['isAttendanceMarked'] == true;

          if (_selectedFilter == 'All') return true;
          if (_selectedFilter == 'Upcoming') {
            return isUpcoming || (isLive && !isAttendanceMarked);
          }
          if (_selectedFilter == 'Completed') {
            return isAttendanceMarked || (isPast && isAttendanceMarked);
          }
          if (_selectedFilter == 'Cancelled') return false;
          return true;
        }).toList();

        if (filteredClasses.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.event_note_rounded, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 12),
                Text(
                  'No classes found for "$_selectedFilter".',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(todayScheduleProvider),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            itemCount: filteredClasses.length,
            itemBuilder: (context, index) {
              final c = filteredClasses[index];
              final startRaw = c['startTime']?.toString() ?? '';
              final endRaw = c['endTime']?.toString() ?? '';
              final startDt = _parseTimeToToday(startRaw);
              final endDt = _parseTimeToToday(endRaw);
              final now = DateTime.now();

              final bool isLive = startDt != null &&
                  endDt != null &&
                  now.isAfter(startDt.subtract(const Duration(minutes: 5))) &&
                  now.isBefore(endDt.add(const Duration(minutes: 15)));
              final bool isPast = endDt != null &&
                  now.isAfter(endDt.add(const Duration(minutes: 15)));
              final bool isAttendanceMarked = c['isAttendanceMarked'] == true;

              final formattedTime = (startRaw.isNotEmpty && endRaw.isNotEmpty)
                  ? '${_formatTime12h(startRaw)} - ${_formatTime12h(endRaw)}'
                  : '${c['startTime'] ?? ''} - ${c['endTime'] ?? ''}';

              String status = 'Upcoming';
              Color statusColor = Colors.orange.shade800;
              Color statusBgColor = Colors.orange.shade50;
              IconData statusIcon = Icons.schedule;

              if (isAttendanceMarked) {
                status = 'Completed';
                statusColor = AppColors.success;
                statusBgColor = AppColors.success.withValues(alpha: 0.12);
                statusIcon = Icons.check_circle_outline;
              } else if (isLive) {
                status = 'Live Now';
                statusColor = AppColors.primary;
                statusBgColor = AppColors.primary.withValues(alpha: 0.12);
                statusIcon = Icons.circle;
              } else if (isPast) {
                status = 'Missed';
                statusColor = AppColors.error;
                statusBgColor = AppColors.error.withValues(alpha: 0.12);
                statusIcon = Icons.warning_amber_rounded;
              }

              // Timeline line and dot styling
              Color lineColor = Colors.grey.shade300;
              Color dotColor = Colors.white;
              Color dotBorderColor = Colors.grey.shade400;

              if (isAttendanceMarked) {
                lineColor = AppColors.success.withValues(alpha: 0.35);
                dotColor = AppColors.success;
                dotBorderColor = AppColors.success;
              } else if (isLive) {
                lineColor = AppColors.primary;
                dotColor = AppColors.primary;
                dotBorderColor = AppColors.primary;
              } else if (isPast) {
                lineColor = AppColors.error.withValues(alpha: 0.35);
                dotColor = Colors.white;
                dotBorderColor = AppColors.error;
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Timeline left side
                      SizedBox(
                        width: 62,
                        child: Column(
                          children: [
                            Text(
                              _formatTime12h(startRaw).isNotEmpty
                                  ? _formatTime12h(startRaw)
                                  : (c['startTime'] ?? '00:00'),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: AppColors.primaryDark,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Expanded(
                              child: Container(
                                width: 2,
                                color: lineColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Dot
                      Column(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            margin: const EdgeInsets.only(top: 4),
                            decoration: BoxDecoration(
                              color: dotColor,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: dotBorderColor,
                                width: 3,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      // Card Right Side
                      Expanded(
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () {
                              if (c['batchId'] != null) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => TeacherAttendanceScreen(
                                      batchId: c['batchId'],
                                      batchName: c['batch'] ?? 'Batch',
                                      subjectId: c['subjectId'],
                                      subjectName: c['subject'],
                                      batchScheduleId: c['batchScheduleId'],
                                      isAlreadyMarked: isAttendanceMarked,
                                    ),
                                  ),
                                ).then((_) {
                                  ref.invalidate(todayScheduleProvider);
                                });
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isAttendanceMarked
                                      ? AppColors.success.withValues(alpha: 0.35)
                                      : (isLive
                                          ? AppColors.primary.withValues(alpha: 0.35)
                                          : (isPast
                                              ? AppColors.error.withValues(alpha: 0.3)
                                              : Colors.grey.shade200)),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.03),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusBgColor,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(statusIcon, size: 12, color: statusColor),
                                            const SizedBox(width: 4),
                                            Text(
                                              status,
                                              style: TextStyle(
                                                color: statusColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          formattedTime,
                                          textAlign: TextAlign.end,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: Colors.grey.shade500,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    c['subject'] ?? 'Subject',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    c['batch'] ?? 'Batch Name',
                                    style: TextStyle(
                                      color: Colors.grey.shade700,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.room,
                                        size: 14,
                                        color: Colors.grey.shade500,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          c['meetUrl'] != null
                                              ? 'Online (Virtual)'
                                              : 'Classroom',
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                            fontSize: 12,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),

                                  // Action / Status Area
                                  if (isAttendanceMarked) ...[
                                    SizedBox(
                                      width: double.infinity,
                                      height: 46,
                                      child: ElevatedButton.icon(
                                        icon: const Icon(
                                          Icons.check_circle_rounded,
                                          size: 18,
                                          color: Colors.white,
                                        ),
                                        label: const Text(
                                          'Attendance Marked • View / Edit',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color: Colors.white,
                                          ),
                                        ),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.success,
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        onPressed: () {
                                          if (c['batchId'] != null) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) =>
                                                    TeacherAttendanceScreen(
                                                  batchId: c['batchId'],
                                                  batchName:
                                                      c['batch'] ?? 'Batch',
                                                  subjectId: c['subjectId'],
                                                  subjectName: c['subject'],
                                                  batchScheduleId:
                                                      c['batchScheduleId'],
                                                  isAlreadyMarked: true,
                                                ),
                                              ),
                                            ).then((_) {
                                              ref.invalidate(
                                                  todayScheduleProvider);
                                            });
                                          }
                                        },
                                      ),
                                    ),
                                  ] else if (isLive) ...[
                                    SizedBox(
                                      width: double.infinity,
                                      height: 46,
                                      child: ElevatedButton.icon(
                                        icon: const Icon(
                                          Icons.assignment_turned_in_rounded,
                                          size: 18,
                                          color: Colors.white,
                                        ),
                                        label: const Text(
                                          'Mark Attendance',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                            color: Colors.white,
                                          ),
                                        ),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primary,
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        onPressed: () {
                                          if (c['batchId'] != null) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) =>
                                                    TeacherAttendanceScreen(
                                                  batchId: c['batchId'],
                                                  batchName:
                                                      c['batch'] ?? 'Batch',
                                                  subjectId: c['subjectId'],
                                                  subjectName: c['subject'],
                                                  batchScheduleId:
                                                      c['batchScheduleId'],
                                                  isAlreadyMarked: false,
                                                ),
                                              ),
                                            ).then((_) {
                                              ref.invalidate(
                                                  todayScheduleProvider);
                                            });
                                          }
                                        },
                                      ),
                                    ),
                                  ] else if (isPast) ...[
                                    SizedBox(
                                      width: double.infinity,
                                      height: 44,
                                      child: OutlinedButton.icon(
                                        icon: const Icon(
                                          Icons.history_rounded,
                                          size: 18,
                                          color: AppColors.error,
                                        ),
                                        label: const Text(
                                          'Mark Late Attendance',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color: AppColors.error,
                                          ),
                                        ),
                                        style: OutlinedButton.styleFrom(
                                          side: BorderSide(
                                            color: AppColors.error
                                                .withValues(alpha: 0.5),
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        onPressed: () {
                                          if (c['batchId'] != null) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) =>
                                                    TeacherAttendanceScreen(
                                                  batchId: c['batchId'],
                                                  batchName:
                                                      c['batch'] ?? 'Batch',
                                                  subjectId: c['subjectId'],
                                                  subjectName: c['subject'],
                                                  batchScheduleId:
                                                      c['batchScheduleId'],
                                                  isAlreadyMarked: false,
                                                ),
                                              ),
                                            ).then((_) {
                                              ref.invalidate(
                                                  todayScheduleProvider);
                                            });
                                          }
                                        },
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
