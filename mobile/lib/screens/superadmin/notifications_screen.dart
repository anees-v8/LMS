import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/superadmin_providers.dart';
import '../../services/api_service.dart';
import 'leads_screen.dart';
import 'subscriptions_screen.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

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

  Future<void> _markAllAsRead(
    BuildContext context,
    WidgetRef ref,
    List<dynamic> leads,
  ) async {
    final api = ref.read(apiServiceProvider);
    final unread = leads.where((l) => l['isRead'] != true).toList();
    if (unread.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All notifications are already marked as read.')),
      );
      return;
    }

    for (final lead in unread) {
      final id = lead['id'] as int?;
      if (id != null) {
        await markLeadRead(api, id);
      }
    }
    ref.invalidate(leadsProvider);
    ref.invalidate(unreadLeadsCountProvider);

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Marked ${unread.length} notifications as read.')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadsAsync = ref.watch(leadsProvider);
    final expiringAsync = ref.watch(expiringSubscriptionsProvider(30));

    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fixed Green Header with Back Button
            Padding(
              padding: const EdgeInsets.only(
                left: 8.0,
                right: 12.0,
                top: 8.0,
                bottom: 16.0,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Expanded(
                    child: Text(
                      'Notifications',
                      style: TextStyle(
                        fontFamily: 'Playfair Display',
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  leadsAsync.maybeWhen(
                    data: (leads) => TextButton(
                      onPressed: () => _markAllAsRead(context, ref, leads),
                      child: const Text(
                        'Mark all read',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                ],
              ),
            ),

            // White Container with scrollable notifications list
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(leadsProvider);
                    ref.invalidate(unreadLeadsCountProvider);
                    ref.invalidate(expiringSubscriptionsProvider(30));
                  },
                  child: leadsAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (err, _) => Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Text(
                          friendlyErrorMessage(err),
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    ),
                    data: (leads) {
                      final expiring =
                          expiringAsync.asData?.value ?? <dynamic>[];

                      // Combine real leads and expiring subs into unified notification items
                      final items = <Map<String, dynamic>>[];

                      for (final sub in expiring) {
                        items.add({
                          'type': 'expiring',
                          'title': 'Subscription Expiring Soon',
                          'description':
                              '${sub['name'] ?? 'Tenant'} (${sub['planName'] ?? 'Plan'}) expires on ${sub['trialEndsAt'] ?? sub['currentPeriodEnd'] ?? 'soon'}.',
                          'time': DateTime.tryParse(
                                '${sub['trialEndsAt'] ?? sub['currentPeriodEnd'] ?? ''}',
                              ) ??
                              DateTime.now(),
                          'isRead': false,
                          'raw': sub,
                        });
                      }

                      for (final lead in leads) {
                        items.add({
                          'type': 'lead',
                          'title':
                              'New Demo Request: ${lead['instituteName'] ?? lead['ownerName']}',
                          'description':
                              '${lead['ownerName']} (${lead['phone']}) - ${lead['city'] ?? 'India'} requested a demo.',
                          'time': DateTime.tryParse('${lead['createdAt']}') ??
                              DateTime.now(),
                          'isRead': lead['isRead'] == true,
                          'raw': lead,
                        });
                      }

                      // Sort newest first
                      items.sort((a, b) {
                        final timeA = a['time'] as DateTime;
                        final timeB = b['time'] as DateTime;
                        return timeB.compareTo(timeA);
                      });

                      if (items.isEmpty) {
                        return ListView(
                          children: const [
                            SizedBox(height: 120),
                            Center(
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
                                    style: TextStyle(
                                      fontSize: 18,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );
                      }

                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          final item = items[index];
                          return _buildNotificationItem(context, ref, item);
                        },
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationItem(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> item,
  ) {
    IconData iconData;
    Color iconColor;
    Color bgColor;

    switch (item['type']) {
      case 'lead':
        iconData = Icons.person_add;
        iconColor = AppColors.info;
        bgColor = AppColors.infoLight;
        break;
      case 'expiring':
        iconData = Icons.warning_rounded;
        iconColor = AppColors.warning;
        bgColor = AppColors.warningLight;
        break;
      default:
        iconData = Icons.info;
        iconColor = Colors.grey.shade700;
        bgColor = AppColors.borderLight;
        break;
    }

    final isRead = item['isRead'] as bool;

    return Container(
      color: isRead
          ? Colors.transparent
          : AppColors.info.withValues(alpha: 0.05),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
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
          item['title'] as String,
          style: TextStyle(
            fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              item['description'] as String,
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            const SizedBox(height: 6),
            Text(
              _timeAgo(item['time'] as DateTime),
              style: const TextStyle(color: Colors.grey, fontSize: 11),
            ),
          ],
        ),
        onTap: () async {
          if (item['type'] == 'lead') {
            final lead = item['raw'] as Map<String, dynamic>;
            final id = lead['id'] as int?;
            if (id != null && !isRead) {
              await markLeadRead(ref.read(apiServiceProvider), id);
              ref.invalidate(leadsProvider);
              ref.invalidate(unreadLeadsCountProvider);
            }
            if (context.mounted) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeadsScreen()),
              );
            }
          } else if (item['type'] == 'expiring') {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SubscriptionsScreen()),
            );
          }
        },
      ),
    );
  }
}
