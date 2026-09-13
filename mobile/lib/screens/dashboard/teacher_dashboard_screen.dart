import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/teacher_providers.dart';

import '../notifications/teacher_notifications_screen.dart';

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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          instituteName,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const TeacherNotificationsScreen(),
                ),
              ).then(
                (_) => ref.invalidate(teacherUnreadNotificationCountProvider),
              );
            },
            icon: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text('$unreadCount'),
              backgroundColor: Colors.redAccent,
              child: const Icon(
                Icons.notifications_none_outlined,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
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
    );
  }
}
