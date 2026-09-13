import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'analytics_screen.dart';
import 'superadmin_profile_screen.dart';
import 'tenants_screen.dart';
import 'plans_screen.dart';
import 'subscriptions_screen.dart';
import 'leads_screen.dart';
import 'broadcast_admins_screen.dart';
import '../../providers/superadmin_providers.dart';
import '../../widgets/app_shell.dart';
import '../../widgets/more_menu_screen.dart';

/// Bottom-nav home for `super_admin`: 4 const Color(0xFF1F2E27) tabs + a "More" tab holding
/// Leads + Logout (mirrors [CoachingAdminShell]'s structure for consistency
/// across roles).
class SuperAdminShell extends StatelessWidget {
  const SuperAdminShell({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShell(
      items: [
        const NavItem(
          icon: Icons.analytics,
          label: 'Analytics',
          screen: AnalyticsScreen(),
        ),
        const NavItem(
          icon: Icons.business,
          label: 'Tenants',
          screen: TenantsScreen(),
        ),
        const NavItem(
          icon: Icons.card_membership,
          label: 'Plans',
          screen: PlansScreen(),
        ),
        const NavItem(
          icon: Icons.receipt_long,
          label: 'Subscriptions',
          screen: SubscriptionsScreen(),
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
                destination: SuperAdminProfileScreen(),
              ),
              MoreMenuItem(
                icon: Icons.inbox,
                label: 'Leads',
                destination: LeadsScreen(),
              ),
              MoreMenuItem(
                icon: Icons.campaign,
                label: 'Send Announcement',
                destination: BroadcastAdminsScreen(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Shows `GET /superadmin/leads/unread-count` as a badge on the "More" tab
/// (Leads lives inside it) so unread demo bookings are visible without
/// opening the tab.
class _MoreIconWithUnreadBadge extends ConsumerWidget {
  const _MoreIconWithUnreadBadge();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadAsync = ref.watch(unreadLeadsCountProvider);
    final count = unreadAsync.asData?.value ?? 0;
    return Badge(
      isLabelVisible: count > 0,
      label: Text('$count'),
      child: const Icon(Icons.more_horiz),
    );
  }
}
