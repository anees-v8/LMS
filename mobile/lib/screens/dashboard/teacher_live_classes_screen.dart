import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../../services/google_auth_service.dart';
import '../../widgets/create_live_class_bottom_sheet.dart';

class TeacherLiveClassesScreen extends ConsumerStatefulWidget {
  const TeacherLiveClassesScreen({super.key});

  @override
  ConsumerState<TeacherLiveClassesScreen> createState() =>
      _TeacherLiveClassesScreenState();
}

class _TeacherLiveClassesScreenState
    extends ConsumerState<TeacherLiveClassesScreen> {
  bool _connectingGoogle = false;

  @override
  Widget build(BuildContext context) {
    final liveAsync = ref.watch(teacherLiveClassesProvider);
    final googleStatusAsync = ref.watch(googleConnectionStatusProvider);
    final googleConnected = googleStatusAsync.value?['connected'] == true;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Live Classes',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        automaticallyImplyLeading: false,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _handleScheduleTap(context, googleConnected),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text(
          'Schedule Class',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: Column(
        children: [
          if (googleStatusAsync.hasValue && !googleConnected)
            _buildGoogleConnectBanner(),
          Expanded(
            child: liveAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _buildError(friendlyErrorMessage(e), ref),
              data: (classes) {
                if (classes.isEmpty)
                  return _buildEmpty(context, googleConnected);
                final upcoming = classes
                    .where((c) => c['isPast'] != true)
                    .toList();
                final past = classes.where((c) => c['isPast'] == true).toList();
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(teacherLiveClassesProvider);
                    ref.invalidate(googleConnectionStatusProvider);
                  },
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 160),
                    children: [
                      if (upcoming.isNotEmpty) ...[
                        _sectionHeader(
                          'Upcoming Classes',
                          upcoming.length,
                          AppColors.primary,
                        ),
                        const SizedBox(height: 8),
                        ...upcoming.map(
                          (c) => _LiveClassCard(
                            liveClass: c,
                            isPast: false,
                            onDelete: () => _confirmDelete(context, ref, c),
                            onEnd: () => _confirmEnd(context, ref, c),
                          ),
                        ),
                      ],
                      if (past.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _sectionHeader(
                          'Past Classes',
                          past.length,
                          Colors.grey,
                        ),
                        const SizedBox(height: 8),
                        ...past.map(
                          (c) => _LiveClassCard(
                            liveClass: c,
                            isPast: true,
                            onDelete: null,
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoogleConnectBanner() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(Icons.link_rounded, color: AppColors.primary, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Connect Google Account',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  'Needed to auto-generate Meet links',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          _connectingGoogle
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : TextButton(
                  onPressed: () => _connectGoogle(context),
                  child: const Text('Connect'),
                ),
        ],
      ),
    );
  }

  Future<void> _connectGoogle(BuildContext context) async {
    setState(() => _connectingGoogle = true);
    try {
      final code = await GoogleAuthService.signInAndGetServerAuthCode();
      if (code == null) {
        setState(() => _connectingGoogle = false);
        return; // user cancelled
      }
      final api = ref.read(apiServiceProvider);
      await connectGoogleAccount(api, code);
      ref.invalidate(googleConnectionStatusProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Google account connected'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not connect: ${friendlyErrorMessage(e)}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _connectingGoogle = false);
    }
  }

  void _handleScheduleTap(BuildContext context, bool googleConnected) {
    if (!googleConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Connect your Google account first')),
      );
      return;
    }
    _showCreateSheet(context, ref);
  }

  Widget _sectionHeader(String title, int count, Color color) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 20,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppColors.primaryDark,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            '$count',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError(String message, WidgetRef ref) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.error_outline, size: 48, color: Colors.red),
        const SizedBox(height: 12),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () => ref.invalidate(teacherLiveClassesProvider),
          child: const Text('Retry'),
        ),
      ],
    ),
  );

  Widget _buildEmpty(BuildContext context, bool googleConnected) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.videocam_off_rounded,
            size: 56,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'No live classes yet',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Schedule your first live class',
          style: TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: () => _handleScheduleTap(context, googleConnected),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          icon: const Icon(Icons.add_rounded),
          label: const Text('Schedule Class'),
        ),
      ],
    ),
  );

  void _showCreateSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateLiveClassBottomSheet(
        onCreated: () => ref.invalidate(teacherLiveClassesProvider),
      ),
    );
  }

  void _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> cls,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Live Class'),
        content: Text('Are you sure you want to delete "${cls['title']}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final api = ref.read(apiServiceProvider);
                await deleteLiveClass(api, cls['id'] as int);
                ref.invalidate(teacherLiveClassesProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Class deleted'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(friendlyErrorMessage(e)),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _confirmEnd(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> cls,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('End Live Class'),
        content: const Text(
          'This only moves the class to "Past Classes" in the app. To actually end the call for everyone, use "End call" inside Google Meet.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final api = ref.read(apiServiceProvider);
                await endLiveClass(api, cls['id'] as int);
                ref.invalidate(teacherLiveClassesProvider);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Marked as ended'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(friendlyErrorMessage(e)),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Mark as Ended'),
          ),
        ],
      ),
    );
  }
}

class _LiveClassCard extends StatelessWidget {
  final Map<String, dynamic> liveClass;
  final bool isPast;
  final VoidCallback? onDelete;
  final VoidCallback? onEnd;
  const _LiveClassCard({
    required this.liveClass,
    required this.isPast,
    required this.onDelete,
    this.onEnd,
  });

  @override
  Widget build(BuildContext context) {
    final scheduledAt = DateTime.parse(
      liveClass['scheduledAt'] as String,
    ).toLocal();
    final dateStr = DateFormat('EEE, dd MMM yyyy').format(scheduledAt);
    final timeStr = DateFormat('hh:mm a').format(scheduledAt);
    final now = DateTime.now();
    final isLive =
        !isPast &&
        scheduledAt.isBefore(now.add(const Duration(minutes: 10))) &&
        scheduledAt.isAfter(now.subtract(const Duration(minutes: 60)));

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isLive
              ? Colors.red.shade300
              : isPast
              ? Colors.grey.shade200
              : AppColors.primary.withValues(alpha: 0.3),
          width: isLive ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isLive
                        ? Colors.red.withValues(alpha: 0.1)
                        : isPast
                        ? Colors.grey.withValues(alpha: 0.1)
                        : AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    isLive
                        ? Icons.live_tv_rounded
                        : isPast
                        ? Icons.history_rounded
                        : Icons.videocam_rounded,
                    color: isLive
                        ? Colors.red
                        : isPast
                        ? Colors.grey
                        : AppColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              liveClass['title'] as String,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isLive)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.fiber_manual_record,
                                    color: Colors.white,
                                    size: 8,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'LIVE',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (isPast)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Ended',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 14,
                            color: Colors.grey.shade500,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            liveClass['batchName'] as String? ?? 'Batch',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (onDelete != null && !isLive)
                  GestureDetector(
                    onTap: onDelete,
                    child: const Padding(
                      padding: EdgeInsets.only(left: 8),
                      child: Icon(
                        Icons.delete_outline_rounded,
                        color: Colors.red,
                        size: 20,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.access_time_rounded,
                    size: 14,
                    color: AppColors.primaryDark,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '$dateStr • $timeStr',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (isLive || !isPast) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () =>
                          _openMeet(context, liveClass['meetUrl'] as String),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLive
                            ? Colors.red
                            : AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.videocam_rounded, size: 18),
                      label: Text(isLive ? 'Join Now' : 'Open Meet Link'),
                    ),
                  ),
                  if (isLive && onEnd != null) ...[
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: onEnd,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.grey.shade700,
                        side: BorderSide(color: Colors.grey.shade300),
                        padding: const EdgeInsets.symmetric(
                          vertical: 10,
                          horizontal: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.stop_circle_outlined, size: 18),
                      label: const Text('End'),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _openMeet(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Could not open Meet link')));
    }
  }
}
