import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/profile/profile_header.dart';
import '../../widgets/profile/profile_info_card.dart';
import '../../widgets/profile/profile_menu_list.dart';
import '../../widgets/profile/profile_notification_toggle.dart';
import '../../widgets/profile/profile_logout_button.dart';

import '../management/teacher_mark_attendance_select_batch.dart';
import '../management/teacher_subjects_screen.dart';
import '../management/teacher_manage_tests_screen.dart';
import '../management/teacher_student_reports_screen.dart';

/// Same visual shell as the student profile — the menu below is exactly
/// Home's "Quick Actions" (Mark Attendance / Upload Material / Manage
/// Tests / Student Reports), just listed as profile rows instead of a grid.
class TeacherProfileScreen extends ConsumerWidget {
  const TeacherProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final fullName = auth.fullName ?? 'Teacher';
    final phone = auth.phone ?? 'Not provided';
    final email = auth.email;
    final instituteName = auth.instituteName;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: ProfileHeader(
              name: fullName,
              subtitleLine1: instituteName,
              subtitleLine2: 'Teacher',
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 20)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ProfileInfoCard(
                rows: [
                  ProfileInfoRowData(
                    icon: Icons.phone_rounded,
                    label: 'Phone',
                    value: phone,
                  ),
                  if (email != null && email.isNotEmpty)
                    ProfileInfoRowData(
                      icon: Icons.email_rounded,
                      label: 'Email',
                      value: email,
                    ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ProfileMenuList(
                items: [
                  ProfileMenuItemData(
                    icon: Icons.how_to_reg,
                    iconBg: AppColors.primary.withValues(alpha: 0.1),
                    iconColor: AppColors.primary,
                    label: 'Mark Attendance',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            const TeacherMarkAttendanceSelectBatchScreen(),
                      ),
                    ),
                  ),
                  ProfileMenuItemData(
                    icon: Icons.upload_file,
                    iconBg: Colors.orange.withValues(alpha: 0.1),
                    iconColor: Colors.orange,
                    label: 'Upload Material',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const TeacherSubjectsScreen(),
                      ),
                    ),
                  ),
                  ProfileMenuItemData(
                    icon: Icons.quiz,
                    iconBg: Colors.purple.withValues(alpha: 0.1),
                    iconColor: Colors.purple,
                    label: 'Manage Tests',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const TeacherManageTestsScreen(),
                      ),
                    ),
                  ),
                  ProfileMenuItemData(
                    icon: Icons.bar_chart,
                    iconBg: Colors.green.withValues(alpha: 0.1),
                    iconColor: Colors.green,
                    label: 'Student Reports',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const TeacherStudentReportsScreen(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: ProfileNotificationToggle(),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 40),
              child: ProfileLogoutButton(),
            ),
          ),
        ],
      ),
    );
  }
}
