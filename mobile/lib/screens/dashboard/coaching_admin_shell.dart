import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
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
import '../../utils/constants.dart';
import '../../widgets/app_shell.dart';
import '../../widgets/more_menu_screen.dart';

/// Opens a legal document (Privacy Policy/Terms) in the external browser —
/// same hosted page shown during login/terms-acceptance, kept in one place
/// (the Next.js legal pages) rather than duplicating content in-app.
Future<void> _openLegalUrl(String url) async {
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

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
          screen: MoreMenuScreen(
            items: [
              const MoreMenuItem(
                icon: Icons.person,
                label: 'Profile',
                destination: AdminProfileScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.notifications,
                label: 'Notifications',
                destination: AdminNotificationsScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.campaign,
                label: 'Send Announcement',
                destination: BroadcastStudentsScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.badge,
                label: 'Teachers',
                destination: TeachersScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.class_,
                label: 'Batches',
                destination: BatchesScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.book,
                label: 'Subjects',
                destination: SubjectsScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.payment,
                label: 'Subscription & Billing',
                destination: SubscriptionScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.list_alt,
                label: 'Browse Plans',
                destination: BrowsePlansScreen(),
              ),
              const MoreMenuItem(
                icon: Icons.help,
                label: 'Help & FAQs',
                destination: HelpScreen(),
              ),
              MoreMenuItem(
                icon: Icons.description,
                label: 'Terms & Privacy Policy',
                onTap: () => _openLegalUrl(Constants.privacyPolicyUrl),
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
