import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// "Security" card on the profile screen — tap-through rows for actions
/// that change sensitive account fields (email, password), each OTP-gated
/// behind its own confirmation flow rather than editable inline here.
class ProfileSecurityCard extends StatelessWidget {
  final List<ProfileSecurityAction> actions;
  const ProfileSecurityCard({super.key, required this.actions});

  @override
  Widget build(BuildContext context) {
    if (actions.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text(
              'Security',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: AppColors.primaryDark,
              ),
            ),
          ),
          for (var i = 0; i < actions.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
            InkWell(
              onTap: actions[i].onTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                child: Row(
                  children: [
                    Icon(actions[i].icon, size: 18, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            actions[i].title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryDark,
                            ),
                          ),
                          if (actions[i].subtitle != null)
                            Text(
                              actions[i].subtitle!,
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right,
                      size: 20,
                      color: Colors.grey,
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}

class ProfileSecurityAction {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  const ProfileSecurityAction({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });
}
