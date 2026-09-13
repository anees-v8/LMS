import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/profile/profile_header.dart';
import '../../widgets/profile/profile_info_card.dart';
import '../../widgets/profile/profile_menu_list.dart';
import '../../widgets/profile/profile_notification_toggle.dart';
import '../../widgets/profile/profile_logout_button.dart';

class StudentProfileScreen extends ConsumerWidget {
  const StudentProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(
            friendlyErrorMessage(e),
            style: const TextStyle(color: Colors.grey),
          ),
        ),
        data: (profile) {
          final studentName = profile['fullName'] as String? ?? 'Student';
          final phone = profile['phone'] as String? ?? 'Not provided';
          final batch = profile['batchName'] as String? ?? 'No batch';
          final rollNoStr = profile['rollNo'] != null
              ? 'Roll No: ${profile['rollNo']}'
              : 'No Roll No';
          final parentPhone =
              profile['parentPhone'] as String? ?? 'Not provided';

          final attendancePct = profile['attendancePct'] as int? ?? 0;
          final testsGiven = profile['testsGiven'] as int? ?? 0;
          final avgScore = profile['avgScore'] as int?;

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: ProfileHeader(
                  name: studentName,
                  subtitleLine1: batch,
                  subtitleLine2: rollNoStr,
                  stats: [
                    ProfileStat(label: 'Attendance', value: '$attendancePct%'),
                    ProfileStat(label: 'Tests Given', value: '$testsGiven'),
                    ProfileStat(
                      label: 'Avg Score',
                      value: avgScore != null ? '$avgScore%' : '--',
                    ),
                  ],
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
                      ProfileInfoRowData(
                        icon: Icons.family_restroom_rounded,
                        label: 'Parent Contact',
                        value: parentPhone,
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: ProfileMenuList(
                    items: [
                      ProfileMenuItemData(
                        icon: Icons.calendar_month_rounded,
                        iconBg: AppColors.successLight,
                        iconColor: AppColors.success,
                        label: 'My Attendance',
                        subtitle: 'View monthly calendar report',
                        onTap: () => _showAttendanceSheet(context),
                      ),
                      ProfileMenuItemData(
                        icon: Icons.analytics_rounded,
                        iconBg: AppColors.infoLight,
                        iconColor: AppColors.info,
                        label: 'Performance Analytics',
                        subtitle: 'Subject-wise score breakdown',
                        onTap: () => _showPerformanceSheet(context),
                      ),
                      ProfileMenuItemData(
                        icon: Icons.account_balance_wallet_rounded,
                        iconBg: AppColors.warningLight,
                        iconColor: Colors.orange,
                        label: 'Fee Details',
                        subtitle: 'Paid ₹8,000 • Pending ₹2,000',
                        onTap: () => _showFeesSheet(context),
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
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
                  child: const ProfileLogoutButton(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAttendanceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AttendanceSheet(),
    );
  }

  void _showPerformanceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PerformanceSheet(),
    );
  }

  void _showFeesSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FeesSheet(),
    );
  }
}

// ─── Bottom Sheets (role-specific, not shared) ─────────────────────────────

class _AttendanceSheet extends ConsumerWidget {
  // ignore: prefer_const_constructors_in_immutables
  _AttendanceSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceAsync = ref.watch(studentAttendanceProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'My Attendance',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: attendanceAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(friendlyErrorMessage(e))),
                data: (monthly) {
                  if (monthly.isEmpty) {
                    return const Center(
                      child: Text('No attendance data available.'),
                    );
                  }
                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: monthly.map((m) {
                      final monthName = m['month'] as String;
                      final total = m['total'] as int;
                      final present = m['present'] as int;
                      final pct = total > 0
                          ? (present / total * 100).toInt()
                          : 0;
                      final color = pct >= 75
                          ? AppColors.success
                          : pct >= 50
                          ? Colors.orange
                          : AppColors.error;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    monthName.trim(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Present: $present / $total days',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$pct%',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: color,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PerformanceSheet extends ConsumerWidget {
  // ignore: prefer_const_constructors_in_immutables
  _PerformanceSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final performanceAsync = ref.watch(studentPerformanceProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Performance Analytics',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: performanceAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(friendlyErrorMessage(e))),
                data: (subjects) {
                  if (subjects.isEmpty) {
                    return const Center(
                      child: Text('No performance data available.'),
                    );
                  }
                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: subjects.map((s) {
                      final subjectName = s['subject'] as String;
                      final score = s['obtainedMarks'] as int;
                      final max = s['totalMarks'] as int;
                      final pct = max > 0 ? score / max : 0.0;
                      final color = pct >= 0.75
                          ? AppColors.success
                          : pct >= 0.5
                          ? Colors.orange
                          : AppColors.error;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    subjectName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: LinearProgressIndicator(
                                      value: pct,
                                      backgroundColor: Colors.grey.shade200,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        color,
                                      ),
                                      minHeight: 7,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Text(
                              '$score/$max',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: color,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeesSheet extends ConsumerWidget {
  // ignore: prefer_const_constructors_in_immutables
  _FeesSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feesAsync = ref.watch(studentFeesProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Fee Details',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: feesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(friendlyErrorMessage(e))),
                data: (feesData) {
                  final total = feesData['total'] as int? ?? 0;
                  final paid = feesData['paid'] as int? ?? 0;
                  final pending = feesData['pending'] as int? ?? 0;
                  final payments =
                      (feesData['payments'] as List<dynamic>?) ?? [];

                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1F2E27), Color(0xFF2E6656)],
                          ),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Total Fees',
                                    style: TextStyle(
                                      color: Colors.white.withValues(
                                        alpha: 0.7,
                                      ),
                                      fontSize: 11,
                                    ),
                                  ),
                                  Text(
                                    '₹$total',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 22,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'Paid',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  '₹$paid',
                                  style: const TextStyle(
                                    color: Color(0xFFA87D26),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                Text(
                                  'Pending: ₹$pending',
                                  style: TextStyle(
                                    color: AppColors.error.withValues(
                                      alpha: 0.85,
                                    ),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (pending > 0) ...[
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFA87D26),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: const Text(
                            'Pay Pending Amount',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      const Text(
                        'Payment History',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (payments.isEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(
                            child: Text(
                              'No payment history found',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ),
                        ),
                      ] else ...[
                        ...payments.map((p) {
                          final pDateStr = p['paidOn']?.toString() ?? '';
                          final pDate =
                              DateTime.tryParse(pDateStr) ?? DateTime.now();
                          final formattedDate =
                              '${pDate.day} ${_getMonth(pDate.month)} ${pDate.year}';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.check_circle_rounded,
                                  color: AppColors.success,
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        p['receiptNo']?.toString() ?? 'Receipt',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primaryDark,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        formattedDate,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '₹${p['amount']}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.success,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getMonth(int m) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (m >= 1 && m <= 12) return months[m - 1];
    return '';
  }
}
