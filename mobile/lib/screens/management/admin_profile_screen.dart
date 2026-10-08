import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/profile/profile_header.dart';
import '../../widgets/profile/profile_info_card.dart';
import '../../widgets/profile/profile_security_card.dart';
import '../../widgets/profile/profile_notification_toggle.dart';
import '../../widgets/profile/profile_logout_button.dart';
import 'change_email_screen.dart';
import 'change_password_screen.dart';

/// Same visual shell as the student/teacher profile screens — coaching_admin
/// has no role-specific quick-action menu here (those live on Dashboard's
/// Quick Actions and the "More" tab already), so this is just identity +
/// notification settings + logout.
class AdminProfileScreen extends ConsumerWidget {
  const AdminProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final fullName = auth.fullName ?? 'Admin';
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
              subtitleLine2: 'Coaching Admin',
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
              child: ProfileSecurityCard(
                actions: [
                  ProfileSecurityAction(
                    icon: Icons.email_outlined,
                    title: email != null && email.isNotEmpty
                        ? 'Change Email'
                        : 'Add Email',
                    subtitle: email == null || email.isEmpty
                        ? 'Required for password reset'
                        : null,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ChangeEmailScreen(),
                      ),
                    ),
                  ),
                  ProfileSecurityAction(
                    icon: Icons.lock_outline,
                    title: 'Change Password',
                    subtitle: email == null || email.isEmpty
                        ? 'Add an email first'
                        : null,
                    onTap: () {
                      if (email == null || email.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Add an email first — it\'s where the confirmation code will be sent.',
                            ),
                          ),
                        );
                        return;
                      }
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ChangePasswordScreen(),
                        ),
                      );
                    },
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
