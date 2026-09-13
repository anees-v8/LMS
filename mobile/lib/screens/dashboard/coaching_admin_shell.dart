import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dashboard_screen.dart';
import '../management/students_screen.dart';
import '../management/admin_profile_screen.dart';
import '../management/teachers_screen.dart';
import '../management/batches_screen.dart';
import '../management/subjects_screen.dart';
import '../fees/fees_management_screen.dart';
import '../reports/reports_screen.dart';
import '../notifications/admin_notifications_screen.dart';
import '../notifications/broadcast_students_screen.dart';
import '../settings/subscription_screen.dart';
import '../settings/browse_plans_screen.dart';
import '../settings/support_screens.dart';
import '../../providers/management_providers.dart';
import '../../widgets/app_shell.dart';
import '../../widgets/more_menu_screen.dart';

/// Bottom-nav home for `coaching_admin`: 4 const Color(0xFF1F2E27) tabs + a "More" tab
/// holding the less-frequently-used sections (mirrors [SuperAdminShell]'s
/// structure for consistency across roles).
class CoachingAdminShell extends StatelessWidget {
  const CoachingAdminShell({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShell(
      items: [
        const NavItem(
          icon: Icons.dashboard,
          label: 'Dashboard',
          screen: DashboardScreen(),
        ),
        const NavItem(
          icon: Icons.people,
          label: 'Students',
          screen: StudentsScreen(),
        ),
        const NavItem(
          icon: Icons.payment,
          label: 'Fees',
          screen: FeesManagementScreen(),
        ),
        const NavItem(
          icon: Icons.assessment,
          label: 'Reports',
          screen: ReportsScreen(),
        ),
        NavItem(
          icon: Icons.more_horiz,
          label: 'More',
          iconWidget: const _MoreIconWithUnreadBadge(),
          screen: const MoreMenuScreen(
            items: [
              MoreMenuItem(
                icon: Icons.person,
                label: 'Profile',
                destination: AdminProfileScreen(),
              ),
              MoreMenuItem(
                icon: Icons.notifications,
                label: 'Notifications',
                destination: AdminNotificationsScreen(),
              ),
              MoreMenuItem(
                icon: Icons.campaign,
                label: 'Send Announcement',
                destination: BroadcastStudentsScreen(),
              ),
              MoreMenuItem(
                icon: Icons.badge,
                label: 'Teachers',
                destination: TeachersScreen(),
              ),
              MoreMenuItem(
                icon: Icons.class_,
                label: 'Batches',
                destination: BatchesScreen(),
              ),
              MoreMenuItem(
                icon: Icons.book,
                label: 'Subjects',
                destination: SubjectsScreen(),
              ),
              MoreMenuItem(
                icon: Icons.payment,
                label: 'Subscription & Billing',
                destination: SubscriptionScreen(),
              ),
              MoreMenuItem(
                icon: Icons.list_alt,
                label: 'Browse Plans',
                destination: BrowsePlansScreen(),
              ),
              MoreMenuItem(
                icon: Icons.help,
                label: 'Help & FAQs',
                destination: HelpScreen(),
              ),
              MoreMenuItem(
                icon: Icons.description,
                label: 'Terms & Privacy Policy',
                destination: PrivacyPolicyScreen(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Shows `GET /admin/notifications/unread-count` as a badge on the "More"
/// tab (Notifications lives inside it).
class _MoreIconWithUnreadBadge extends ConsumerWidget {
  const _MoreIconWithUnreadBadge();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadAsync = ref.watch(unreadNotificationCountProvider);
    final count = unreadAsync.asData?.value ?? 0;
    return Badge(
      isLabelVisible: count > 0,
      label: Text('$count'),
      child: const Icon(Icons.more_horiz),
    );
  }
}
