import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/app_colors.dart';
import '../services/api_service.dart';

/// Renders a `NotificationItem[]` list (`{id, title, body, isRead,
/// createdAt}`) with a mark-read affordance on unread rows. Shared by every
/// role's inbox screen (Coaching Admin now; Student once its shell exists) —
/// the list rendering is identical, only the data source (which endpoint
/// backs it) differs per role.
class NotificationsListView extends StatelessWidget {
  final AsyncValue<List<dynamic>> notificationsAsync;
  final Future<void> Function() onRefresh;
  final Future<void> Function(int id) onMarkRead;

  const NotificationsListView({
    super.key,
    required this.notificationsAsync,
    required this.onRefresh,
    required this.onMarkRead,
  });

  String _timeAgo(DateTime dateTime) {
    final difference = DateTime.now().difference(dateTime);
    if (difference.inDays > 0) {
      return '${difference.inDays} ${difference.inDays == 1 ? 'day' : 'days'} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} ${difference.inHours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'minute' : 'minutes'} ago';
    } else {
      return 'Just now';
    }
  }

  Widget _buildNotificationItem(Map<String, dynamic> notification) {
    IconData iconData;
    Color iconColor;
    Color bgColor;

    switch (notification['type']) {
      case 'lead':
        iconData = Icons.person_add;
        iconColor = AppColors.info;
        bgColor = AppColors.infoLight;
        break;
      case 'payment':
        iconData = Icons.payments;
        iconColor = AppColors.success;
        bgColor = AppColors.successLight;
        break;
      case 'expiring':
        iconData = Icons.warning_rounded;
        iconColor = AppColors.warning;
        bgColor = AppColors.warningLight;
        break;
      case 'system':
      default:
        iconData = Icons.info;
        iconColor = Colors.grey.shade700;
        bgColor = AppColors.borderLight;
        break;
    }

    final isRead = notification['isRead'] == true;
    final timeStr = notification['createdAt']?.toString() ?? '';
    final time = timeStr.isNotEmpty ? DateTime.tryParse(timeStr) : null;
    final desc = notification['body']?.toString() ?? '';

    return Container(
      color: isRead
          ? Colors.transparent
          : AppColors.info.withValues(alpha: 0.03),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        leading: Stack(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
              child: Icon(iconData, color: iconColor, size: 24),
            ),
            if (!isRead)
              Positioned(
                right: 0,
                top: 0,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
        title: Text(
          notification['title']?.toString() ?? '',
          style: TextStyle(
            fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (desc.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                desc,
                style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              time != null ? _timeAgo(time) : '',
              style: const TextStyle(color: Colors.grey, fontSize: 11),
            ),
          ],
        ),
        onTap: isRead ? null : () => onMarkRead(notification['id'] as int),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return notificationsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(child: Text(friendlyErrorMessage(err))),
      data: (notifications) {
        if (notifications.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.notifications_off_outlined,
                  size: 64,
                  color: Colors.grey,
                ),
                SizedBox(height: 16),
                Text(
                  'No new notifications',
                  style: TextStyle(fontSize: 18, color: Colors.grey),
                ),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final n = notifications[index] as Map<String, dynamic>;
              return _buildNotificationItem(n);
            },
          ),
        );
      },
    );
  }
}
