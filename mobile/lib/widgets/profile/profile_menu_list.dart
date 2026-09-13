import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class ProfileMenuItemData {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String label;
  final String? subtitle;
  final VoidCallback onTap;
  const ProfileMenuItemData({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.label,
    this.subtitle,
    required this.onTap,
  });
}

/// White card of tappable rows — shared shell for a role's profile menu
/// (student: Attendance/Performance/Fees; teacher: whatever's on their
/// Home "Quick Actions"; same visual treatment either way).
class ProfileMenuList extends StatelessWidget {
  final List<ProfileMenuItemData> items;
  const ProfileMenuList({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 60),
            _MenuItem(data: items[i]),
          ],
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final ProfileMenuItemData data;
  const _MenuItem({required this.data});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: data.iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(data.icon, color: data.iconColor, size: 20),
        ),
        title: Text(
          data.label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: AppColors.primaryDark,
          ),
        ),
        subtitle: data.subtitle != null
            ? Text(
                data.subtitle!,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              )
            : null,
        trailing: const Icon(
          Icons.arrow_forward_ios_rounded,
          size: 14,
          color: Colors.grey,
        ),
        onTap: data.onTap,
      ),
    );
  }
}
