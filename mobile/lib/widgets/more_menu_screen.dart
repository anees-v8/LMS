import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../theme/app_colors.dart';
import 'profile/profile_header.dart';
import 'profile/profile_menu_list.dart';
import 'profile/profile_logout_button.dart';

/// One row in a [MoreMenuScreen]. Either pushes [destination] or runs
/// [onTap] — exactly one of the two must be given.
class MoreMenuItem {
  final IconData icon;
  final String label;
  final Widget? destination;
  final VoidCallback? onTap;

  const MoreMenuItem({
    required this.icon,
    required this.label,
    this.destination,
    this.onTap,
  }) : assert(
         destination != null || onTap != null,
         'Provide either destination or onTap',
       );
}

/// The "More" tab shown in every role's bottom nav — holds secondary screens
/// that don't fit as primary tabs, plus a Logout action at the bottom. This
/// is the one place Logout lives, kept consistent across roles.
class MoreMenuScreen extends ConsumerWidget {
  final List<MoreMenuItem> items;

  const MoreMenuScreen({super.key, required this.items});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final fullName = authState.fullName ?? 'User';
    final subtitle1 = authState.instituteName ?? authState.userRole ?? '';

    // A curated list of colors to cycle through for menu icons,
    // bringing the visual style in line with the student/teacher profiles.
    final colors = [
      AppColors.primary,
      Colors.orange,
      Colors.purple,
      AppColors.success,
      AppColors.info,
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: ProfileHeader(name: fullName, subtitleLine1: subtitle1),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 20)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ProfileMenuList(
                items: List.generate(items.length, (index) {
                  final item = items[index];
                  final color = colors[index % colors.length];
                  return ProfileMenuItemData(
                    icon: item.icon,
                    iconBg: color.withValues(alpha: 0.1),
                    iconColor: color,
                    label: item.label,
                    onTap:
                        item.onTap ??
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => item.destination!),
                        ),
                  );
                }),
              ),
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
