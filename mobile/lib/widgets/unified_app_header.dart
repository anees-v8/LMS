import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Clean, modern PhonePe-style unified top header.
/// Features:
/// - Light/white background with subtle bottom hairline and soft elevation.
/// - Left: User/Institute Avatar + Name + Subtitle (role or location) with a subtle chevron.
/// - Right: PhonePe-style QR Scanner pill button + Notification bell with unread badge.
/// - Compatible with `Scaffold.appBar` as a [PreferredSizeWidget].
class UnifiedAppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final String? avatarUrl;
  final String? initials;
  final VoidCallback? onProfileTap;
  final bool showQrScanner;
  final VoidCallback? onQrTap;
  final bool showNotifications;
  final int unreadNotificationsCount;
  final VoidCallback? onNotificationsTap;
  final List<Widget>? trailingActions;
  final Widget? leading;
  final double elevation;

  const UnifiedAppHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.avatarUrl,
    this.initials,
    this.onProfileTap,
    this.showQrScanner = true,
    this.onQrTap,
    this.showNotifications = true,
    this.unreadNotificationsCount = 0,
    this.onNotificationsTap,
    this.trailingActions,
    this.leading,
    this.elevation = 0,
  });

  @override
  Size get preferredSize => const Size.fromHeight(62);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(
            color: AppColors.borderLight,
            width: 1.2,
          ),
        ),
        boxShadow: elevation > 0
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04 * elevation),
                  blurRadius: 4 * elevation,
                  offset: const Offset(0, 2),
                ),
              ]
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: SafeArea(
        bottom: false,
        child: Container(
          height: 62,
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width > 720 ? 24 : 16,
          ),
          child: Row(
            children: [
              // Left Section: Leading Widget OR Avatar + Title + Subtitle
              if (leading != null)
                leading!
              else
                Expanded(
                  child: InkWell(
                    onTap: onProfileTap,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
                      child: Row(
                        children: [
                          // Avatar
                          _buildAvatar(),
                          const SizedBox(width: 12),
                          // Title & Subtitle Column
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        title,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primaryDark,
                                          letterSpacing: -0.2,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (onProfileTap != null && (subtitle == null || subtitle!.isEmpty))
                                      const Icon(
                                        Icons.keyboard_arrow_down_rounded,
                                        size: 18,
                                        color: AppColors.textSecondary,
                                      ),
                                  ],
                                ),
                                if (subtitle != null && subtitle!.isNotEmpty) ...[
                                  const SizedBox(height: 1),
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          subtitle!,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                            color: AppColors.textSecondary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (onProfileTap != null)
                                        const Icon(
                                          Icons.keyboard_arrow_right_rounded,
                                          size: 15,
                                          color: AppColors.textSecondary,
                                        ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Right Section: QR Scanner + Notifications + Extra Actions
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (showQrScanner && onQrTap != null) ...[
                    _buildIconButton(
                      icon: Icons.qr_code_scanner_rounded,
                      tooltip: 'Scan QR',
                      onTap: onQrTap!,
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (showNotifications && onNotificationsTap != null) ...[
                    _buildNotificationButton(),
                    const SizedBox(width: 4),
                  ],
                  ...?trailingActions,
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    final cleanInitials = (initials != null && initials!.trim().isNotEmpty)
        ? (initials!.trim().length > 2 ? initials!.trim().substring(0, 2) : initials!.trim()).toUpperCase()
        : (title.isNotEmpty ? title.trim()[0].toUpperCase() : 'A');

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: AppColors.background,
        shape: BoxShape.circle,
        border: Border.all(
          color: AppColors.borderMedium,
          width: 1.5,
        ),
      ),
      child: ClipOval(
        child: avatarUrl != null && avatarUrl!.isNotEmpty
            ? Image.network(
                avatarUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _buildInitials(cleanInitials),
              )
            : _buildInitials(cleanInitials),
      ),
    );
  }

  Widget _buildInitials(String text) {
    return Center(
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.primaryDark,
          fontWeight: FontWeight.w700,
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.borderLight,
              width: 1.2,
            ),
          ),
          child: Icon(
            icon,
            color: AppColors.primaryDark,
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationButton() {
    return Tooltip(
      message: 'Notifications',
      child: InkWell(
        onTap: onNotificationsTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.borderLight,
              width: 1.2,
            ),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              const Center(
                child: Icon(
                  Icons.notifications_none_rounded,
                  color: AppColors.primaryDark,
                  size: 20,
                ),
              ),
              if (unreadNotificationsCount > 0)
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    child: Text(
                      unreadNotificationsCount > 99 ? '99+' : '$unreadNotificationsCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        height: 1,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
