import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';

class TeacherNotificationsScreen extends ConsumerWidget {
  const TeacherNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(teacherNotificationsProvider);

    Future<void> markRead(int id) async {
      await markTeacherNotificationRead(ref.read(apiServiceProvider), id);
      ref.invalidate(teacherNotificationsProvider);
      ref.invalidate(teacherUnreadNotificationCountProvider);
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: notificationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(
            friendlyErrorMessage(e),
            style: const TextStyle(color: Colors.grey),
          ),
        ),
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
                    'No notifications yet',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: notifications.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final notif = notifications[index] as Map<String, dynamic>;
              final id = notif['id'] as int?;
              final title = notif['title'] as String? ?? 'Notification';
              final body = notif['body'] as String? ?? '';
              final isRead = notif['isRead'] as bool? ?? false;
              final createdAtStr = notif['createdAt'] as String?;

              String timeAgo = 'Just now';
              if (createdAtStr != null) {
                try {
                  final dt = DateTime.parse(createdAtStr);
                  final diff = DateTime.now().difference(dt);
                  if (diff.inDays > 0) {
                    timeAgo = '${diff.inDays}d ago';
                  } else if (diff.inHours > 0) {
                    timeAgo = '${diff.inHours}h ago';
                  } else if (diff.inMinutes > 0) {
                    timeAgo = '${diff.inMinutes}m ago';
                  }
                } catch (_) {}
              }

              return InkWell(
                onTap: (!isRead && id != null) ? () => markRead(id) : null,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isRead
                        ? Colors.white
                        : AppColors.primary.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isRead
                          ? Colors.grey.shade100
                          : AppColors.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: isRead
                              ? Colors.grey.shade100
                              : AppColors.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.notifications_rounded,
                          color: isRead ? Colors.grey : AppColors.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    title,
                                    style: TextStyle(
                                      fontWeight: isRead
                                          ? FontWeight.w600
                                          : FontWeight.bold,
                                      fontSize: 14,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                ),
                                Text(
                                  timeAgo,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              body,
                              style: TextStyle(
                                fontSize: 12,
                                color: isRead
                                    ? Colors.grey.shade600
                                    : Colors.black87,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
