import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/attendance/attendance_status_button.dart';
import '../../widgets/attendance/attendance_summary_bar.dart';
import '../../widgets/attendance/attendance_done_fab.dart';
import '../../widgets/attendance/attendance_confirm_sheet.dart';
import 'teacher_qr_attendance_screen.dart';

class TeacherAttendanceScreen extends ConsumerStatefulWidget {
  final int batchId;
  final String batchName;
  final int subjectId;
  final int? batchScheduleId;

  const TeacherAttendanceScreen({
    super.key,
    required this.batchId,
    required this.batchName,
    required this.subjectId,
    this.batchScheduleId,
  });

  @override
  ConsumerState<TeacherAttendanceScreen> createState() =>
      _TeacherAttendanceScreenState();
}

class _TeacherAttendanceScreenState
    extends ConsumerState<TeacherAttendanceScreen> {
  // Map of studentId -> 'present' | 'absent' | 'late'
  final Map<int, String> _attendanceState = {};

  @override
  void initState() {
    super.initState();
    // attendanceBatchStudentsProvider is a FutureProvider.family, cached per
    // (batchId, date) for the life of the provider container — a teacher
    // who opened this batch before a student was newly enrolled would keep
    // seeing that stale roster indefinitely (no re-fetch trigger otherwise
    // exists). Force a fresh fetch every time this screen opens so a
    // recently-added student always shows up without needing an app
    // restart or a submit-attendance round trip.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.invalidate(
          attendanceBatchStudentsProvider((
            batchId: widget.batchId,
            date: DateFormat('yyyy-MM-dd').format(DateTime.now()),
            subjectId: widget.subjectId,
          )),
        );
      }
    });
  }

  void _markAll(String status, List<dynamic> students) {
    setState(() {
      for (final s in students) {
        final sid = _studentId(s);
        _attendanceState[sid] = status;
      }
    });
  }

  int _studentId(dynamic s) {
    final raw = s['studentId'];
    return raw is int ? raw : int.tryParse(raw?.toString() ?? '0') ?? 0;
  }

  String? _statusFor(dynamic s) {
    final sid = _studentId(s);
    return _attendanceState.containsKey(sid)
        ? _attendanceState[sid]
        : s['status'] as String?;
  }

  Future<void> _submit(List<dynamic> students) async {
    // Anyone left unmarked is treated as Present here — the confirm sheet
    // already told the teacher exactly who, by name, before this runs.
    final records = students.map((s) {
      final sid = _studentId(s);
      final status = _statusFor(s) ?? 'present';
      return {'studentId': sid, 'status': status};
    }).toList();

    final api = ref.read(apiServiceProvider);
    await api.post('/teacher/attendance', {
      'batchId': widget.batchId,
      'subjectId': widget.subjectId,
      if (widget.batchScheduleId != null)
        'batchScheduleId': widget.batchScheduleId,
      'date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
      'records': records,
    });
  }

  Future<void> _openConfirmSheet(List<dynamic> students) async {
    final todayLabel = DateFormat('dd MMM yyyy').format(DateTime.now());
    int present = 0, absent = 0, late = 0;
    final unmarkedNames = <String>[];

    for (final s in students) {
      final status = _statusFor(s);
      if (status == 'present') {
        present++;
      } else if (status == 'absent') {
        absent++;
      } else if (status == 'late') {
        late++;
      } else {
        unmarkedNames.add((s['name'] as String? ?? 'Student').split(' ').first);
      }
    }

    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AttendanceConfirmSheet(
        dateLabel: todayLabel,
        batchName: widget.batchName,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        unmarkedNames: unmarkedNames,
        onConfirm: () => _submit(students),
      ),
    );

    if (submitted == true && mounted) {
      // Fixes the stale-list bug: without this, re-opening the same
      // batch/date would still show pre-submit data until app restart.
      ref.invalidate(
        attendanceBatchStudentsProvider((
          batchId: widget.batchId,
          date: DateFormat('yyyy-MM-dd').format(DateTime.now()),
          subjectId: widget.subjectId,
        )),
      );
      await Future.delayed(const Duration(milliseconds: 900));
      if (mounted) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayStrAPI = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final studentsAsync = ref.watch(
      attendanceBatchStudentsProvider((
        batchId: widget.batchId,
        date: todayStrAPI,
        subjectId: widget.subjectId,
      )),
    );
    final todayStr = DateFormat('dd MMM yyyy').format(DateTime.now());

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Attendance: ${widget.batchName}',
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            tooltip: 'QR Attendance',
            icon: const Icon(Icons.qr_code_rounded, color: Colors.white),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => TeacherQrAttendanceScreen(
                  batchId: widget.batchId,
                  batchName: widget.batchName,
                  subjectId: widget.subjectId,
                  batchScheduleId: widget.batchScheduleId,
                ),
              ),
            ),
          ),
        ],
      ),
      body: studentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text(friendlyErrorMessage(err))),
        data: (students) {
          if (students.isEmpty) {
            return const Center(
              child: Text('No students found in this batch.'),
            );
          }

          int present = 0, absent = 0, late = 0, marked = 0;
          for (final s in students) {
            final status = _statusFor(s);
            if (status != null) marked++;
            if (status == 'present') present++;
            if (status == 'absent') absent++;
            if (status == 'late') late++;
          }
          final hasAnyMarked = marked > 0;

          return Stack(
            children: [
              Column(
                children: [
                  // Header controls
                  Container(
                    padding: const EdgeInsets.all(16),
                    color: Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              todayStr,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            TextButton(
                              onPressed: () => _markAll('present', students),
                              child: const Text(
                                'Mark All Present',
                                style: TextStyle(color: AppColors.success),
                              ),
                            ),
                          ],
                        ),
                        if (hasAnyMarked) ...[
                          const SizedBox(height: 6),
                          AttendanceSummaryBar(
                            present: present,
                            absent: absent,
                            late: late,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Students list
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: () async => ref.invalidate(
                        attendanceBatchStudentsProvider((
                          batchId: widget.batchId,
                          date: todayStrAPI,
                          subjectId: widget.subjectId,
                        )),
                      ),
                      child: ListView.separated(
                        padding: const EdgeInsets.only(bottom: 100),
                        physics: const AlwaysScrollableScrollPhysics(),
                        itemCount: students.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final student = students[index];
                          final sid = _studentId(student);
                          final name = student['name'];
                          final status = _statusFor(student);

                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 4,
                            ),
                            title: Text(
                              name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            subtitle: Text('ID: $sid'),
                            trailing: AttendanceStatusButtonRow(
                              status: status,
                              onChanged: (val) =>
                                  setState(() => _attendanceState[sid] = val),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),

              // Floating Done button — appears once at least one student is marked
              Positioned(
                left: 20,
                right: 20,
                bottom: 20,
                child: SafeArea(
                  top: false,
                  child: AttendanceDoneFab(
                    markedCount: marked,
                    totalCount: students.length,
                    visible: hasAnyMarked,
                    onTap: () => _openConfirmSheet(students),
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
