import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/unified_app_header.dart';
import 'student_subject_details_screen.dart';
import 'student_notifications_screen.dart';
import 'student_scan_attendance_screen.dart';
import 'student_profile_screen.dart';

class StudentLearnScreen extends ConsumerWidget {
  const StudentLearnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final studentName = authState.fullName ?? 'Student';
    final instituteName = authState.instituteName ?? 'Academy';
    final unreadCount =
        ref.watch(studentUnreadNotificationCountProvider).asData?.value ?? 0;

    final parts = studentName.trim().split(' ');
    final initials = parts.length > 1
        ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
        : (studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S');

    final subjectsAsync = ref.watch(studentSubjectsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: UnifiedAppHeader(
        title: studentName,
        subtitle: instituteName,
        initials: initials,
        unreadNotificationsCount: unreadCount,
        onProfileTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const StudentProfileScreen(),
            ),
          );
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
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(studentSubjectsProvider);
          ref.invalidate(studentUnreadNotificationCountProvider);
          try {
            await ref.read(studentSubjectsProvider.future);
          } catch (_) {}
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Section Title ────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'My Subjects',
                      style: TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    subjectsAsync.maybeWhen(
                      data: (subs) => Text(
                        '${subs.length} subjects enrolled',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                        ),
                      ),
                      orElse: () => const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 16)),

          // ── Subject Grid ─────────────────────────────────────────────
          subjectsAsync.when(
            loading: () => const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(32.0),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (e, _) => SliverToBoxAdapter(
              child: Center(
                child: Text(
                  'Failed to load: ${friendlyErrorMessage(e)}',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
            ),
            data: (subjects) {
              if (subjects.isEmpty) {
                return const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.only(top: 40),
                      child: Text(
                        'No subjects found',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  ),
                );
              }
              return SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.88,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _SubjectCard(
                      subject: subjects[index] as Map<String, dynamic>,
                    ),
                    childCount: subjects.length,
                  ),
                ),
              );
            },
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    ),
  );
}
}

class _SubjectCard extends StatelessWidget {
  final Map<String, dynamic> subject;
  const _SubjectCard({required this.subject});

  @override
  Widget build(BuildContext context) {
    // Generate a consistent color based on ID if not provided
    final id = subject['id'] as int? ?? 0;
    final colors = [
      const Color(0xFF3F88C5),
      const Color(0xFF2E6656),
      const Color(0xFF9C4E97),
      const Color(0xFF4CAF50),
      const Color(0xFFA87D26),
      const Color(0xFFE53935),
    ];
    final color = colors[id % colors.length];

    final progress = (subject['progress'] as num?)?.toDouble() ?? 0.0;
    final totalChapters = subject['totalChapters'] as int? ?? 0;
    final completedChapters = subject['completedChapters'] as int? ?? 0;
    final name = subject['name'] as String? ?? 'Subject';

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => StudentSubjectDetailsScreen(subject: subject),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade100),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon & Progress
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.book_rounded, color: color, size: 24),
                ),
                Text(
                  '${(progress * 100).toInt()}%',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const Spacer(),
            // Name
            Text(
              name,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: AppColors.primaryDark,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            // Chapters info
            Text(
              '$completedChapters / $totalChapters Chapters',
              style: const TextStyle(
                fontSize: 11,
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 10),
            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.grey.shade100,
                valueColor: AlwaysStoppedAnimation<Color>(color),
                minHeight: 5,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${(progress * 100).toInt()}% completed',
              style: TextStyle(
                fontSize: 10,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
