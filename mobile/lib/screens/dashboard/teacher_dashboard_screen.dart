import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_providers.dart';

import '../notifications/teacher_notifications_screen.dart';
import '../../widgets/unified_app_header.dart';

// Import our new sub-components
import '../../widgets/teacher/teacher_welcome_header.dart';
import '../../widgets/teacher/teacher_quick_actions.dart';
import '../../widgets/teacher/teacher_schedule_list.dart';
import '../../widgets/teacher/teacher_batch_list.dart';

class TeacherDashboardScreen extends ConsumerWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final fullName = authState.fullName ?? 'Teacher';
    final instituteName = authState.instituteName ?? 'Campus';

    final unreadCount =
        ref.watch(teacherUnreadNotificationCountProvider).asData?.value ?? 0;
    final scheduleAsync = ref.watch(todayScheduleProvider);
    final classesToday = scheduleAsync.maybeWhen(
      data: (data) {
        final classes = List<Map<String, dynamic>>.from(data['classes'] ?? []);
        return classes.length;
      },
      orElse: () => 0,
    );

    final parts = fullName.trim().split(' ');
    final initials = parts.length > 1
        ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
        : (fullName.isNotEmpty ? fullName[0].toUpperCase() : 'T');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: UnifiedAppHeader(
        title: fullName,
        subtitle: instituteName,
        initials: initials,
        showQrScanner: false,
        unreadNotificationsCount: unreadCount,
        onProfileTap: () {
          ref.read(teacherShellTabIndexProvider.notifier).setTab(4);
        },
        onNotificationsTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const TeacherNotificationsScreen(),
            ),
          ).then(
            (_) => ref.invalidate(teacherUnreadNotificationCountProvider),
          );
        },
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(todayScheduleProvider);
          ref.invalidate(myBatchesProvider);
          ref.invalidate(teacherUnreadNotificationCountProvider);
        },
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TeacherWelcomeHeader(
                teacherName: fullName,
                classesToday: classesToday,
              ),
              const SizedBox(height: 24),

              const TeacherQuickActions(),
              const SizedBox(height: 32),

              const TeacherScheduleList(),
              const SizedBox(height: 32),

              const TeacherBatchList(),
              const SizedBox(height: 48), // Bottom padding
            ],
          ),
        ),
      ),
    ),
  );
  }
}
