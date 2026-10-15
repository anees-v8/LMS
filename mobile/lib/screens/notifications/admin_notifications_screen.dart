import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/notifications_list_view.dart';

/// Coaching Admin's own notification inbox — `GET /admin/notifications`.
class AdminNotificationsScreen extends ConsumerWidget {
  const AdminNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);
    final screenWidth = MediaQuery.of(context).size.width;
    final double hPadding = screenWidth >= 900 ? 36.0 : (screenWidth >= 650 ? 32.0 : 20.0);

    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fixed Green Header
            Padding(
              padding: EdgeInsets.only(
                left: hPadding,
                right: hPadding,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Notifications',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Alerts and updates for your institute',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // White Container with fixed parts and scrollable list
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: NotificationsListView(
                  notificationsAsync: notificationsAsync,
                  onRefresh: () async => ref.invalidate(notificationsProvider),
                  onMarkRead: (id) async {
                    await markNotificationRead(
                      ref.read(apiServiceProvider),
                      id,
                    );
                    ref.invalidate(notificationsProvider);
                    ref.invalidate(unreadNotificationCountProvider);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
