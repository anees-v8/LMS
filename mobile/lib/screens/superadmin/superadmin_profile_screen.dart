import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/profile/profile_header.dart';
import '../../widgets/profile/profile_info_card.dart';
import '../../widgets/profile/profile_notification_toggle.dart';
import '../../widgets/profile/profile_logout_button.dart';

/// Same visual shell as every other role's profile screen — identity +
/// notification settings + logout. super_admin has no tenant to show as a
/// subtitle (tenantId is null for this role), so it's omitted.
class SuperAdminProfileScreen extends ConsumerWidget {
  const SuperAdminProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final fullName = auth.fullName ?? 'Super Admin';
    final phone = auth.phone ?? 'Not provided';
    final email = auth.email;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: ProfileHeader(name: fullName, subtitleLine1: 'Super Admin'),
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
