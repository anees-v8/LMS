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

        // Mock filtering based on index for visual demonstration
        final filteredClasses = classes.where((c) {
          final isLive = classes.indexOf(c) == 0;
          final isCompleted =
              classes.indexOf(c) > 0 &&
              classes.indexOf(c) < 2; // Arbitrary logic

          if (_selectedFilter == 'All') return true;
          if (_selectedFilter == 'Upcoming' && !isCompleted && !isLive)
            return true;
          if (_selectedFilter == 'Completed' && isCompleted) return true;
          return false;
        }).toList();

        if (filteredClasses.isEmpty) {
          return const Center(
            child: Text(
              'No classes found for this filter.',
              style: TextStyle(color: Colors.grey),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(24),
          itemCount: filteredClasses.length,
          itemBuilder: (context, index) {
            final c = filteredClasses[index];
            final isLive = classes.indexOf(c) == 0;
            final isCompleted = classes.indexOf(c) == 1; // mock logic

            String status = 'Upcoming';
            Color statusColor = Colors.orange;
            if (isLive) {
              status = 'Live Now';
              statusColor = Colors.red;
            } else if (isCompleted) {
              status = 'Completed';
              statusColor = Colors.grey;
            }

            return Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Timeline left side
                    SizedBox(
                      width: 70,
                      child: Column(
                        children: [
                          Text(
                            c['startTime'] ?? '00:00',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.primaryDark,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Expanded(
                            child: Container(
                              width: 2,
                              color: isLive
                                  ? AppColors.primary
                                  : Colors.grey.shade300,
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
                            color: isLive ? AppColors.primary : Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isLive
                                  ? AppColors.primary
                                  : Colors.grey.shade400,
                              width: 3,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    // Card Right Side
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
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
                                    color: statusColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    status.toUpperCase(),
                                    style: TextStyle(
                                      color: statusColor,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  '${c['startTime']} - ${c['endTime']}',
                                  style: TextStyle(
                                    color: Colors.grey.shade500,
                                    fontSize: 11,
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
                                Text(
                                  c['meetUrl'] != null
                                      ? 'Online (Virtual)'
                                      : 'Classroom',
                                  style: TextStyle(
                                    color: Colors.grey.shade600,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            if (isLive || isCompleted)
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isLive
                                        ? AppColors.primary
                                        : Colors.white,
                                    foregroundColor: isLive
                                        ? Colors.white
                                        : AppColors.primary,
                                    side: isLive
                                        ? null
                                        : const BorderSide(
                                            color: AppColors.primary,
                                          ),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
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
                                                batchScheduleId:
                                                    c['batchScheduleId'],
                                              ),
                                        ),
                                      );
                                    }
                                  },
                                  child: Text(
                                    isLive
                                        ? 'Mark Attendance'
                                        : 'View Attendance',
                                  ),
                                ),
                              ),
                          ],
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
