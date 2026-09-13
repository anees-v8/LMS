import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../management/students_screen.dart';
import '../management/teachers_screen.dart';
import '../management/batches_screen.dart';
import '../fees/fees_management_screen.dart';
import '../reports/reports_screen.dart';
import '../notifications/admin_notifications_screen.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/app_shell.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  String _formatDate(DateTime? date) {
    if (date == null) return 'N/A';
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
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }

  String _formatMonthYear(DateTime date) {
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
    return '${months[date.month - 1]} ${date.year}';
  }

  void _showMonthPicker(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext ctx) {
        return Container(
          padding: const EdgeInsets.all(16),
          height: 350,
          child: Column(
            children: [
              const Text(
                'Select Month',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: 12,
                  itemBuilder: (context, index) {
                    final d = DateTime.now();
                    final monthDate = DateTime(d.year, d.month - index, 1);
                    final selected = ref.read(selectedAnalyticsMonthProvider);
                    final isSelected =
                        selected.month == monthDate.month &&
                        selected.year == monthDate.year;
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

                    return ListTile(
                      title: Text(
                        '${months[monthDate.month - 1]} ${monthDate.year}',
                      ),
                      trailing: isSelected
                          ? const Icon(Icons.check, color: Colors.teal)
                          : null,
                      onTap: () {
                        ref
                            .read(selectedAnalyticsMonthProvider.notifier)
                            .setMonth(monthDate);
                        Navigator.pop(ctx);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(dashboardProvider);
    final authState = ref.watch(authProvider);

    final String name = authState.instituteName ?? 'Dashboard';
    final String location = 'Maharashtra'; // Placeholder

    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      resizeToAvoidBottomInset: false,
      body: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text(friendlyErrorMessage(err))),
        data: (dash) {
          final sub = dash['subscription'];
          final overview = dash['overview'] ?? {};
          final bool isActive = true; // Dashboard is accessible, so active.

          return SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Fixed Green Header
                Padding(
                  padding: const EdgeInsets.only(
                    left: 20.0,
                    right: 12.0,
                    top: 10.0,
                    bottom: 20.0,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(
                            fontFamily: 'Playfair Display',
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Consumer(
                        builder: (context, ref, _) {
                          final unreadCount =
                              ref
                                  .watch(unreadNotificationCountProvider)
                                  .value ??
                              0;
                          return IconButton(
                            icon: Badge(
                              isLabelVisible: unreadCount > 0,
                              label: Text(
                                '$unreadCount',
                                style: const TextStyle(fontSize: 10),
                              ),
                              child: const Icon(
                                Icons.notifications_none,
                                color: Colors.white,
                                size: 28,
                              ),
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      const AdminNotificationsScreen(),
                                ),
                              );
                            },
                          );
                        },
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
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Subscription Banner
                          if (sub != null) ...[
                            Builder(
                              builder: (context) {
                                final planName =
                                    sub['planName']?.toString() ?? 'N/A';
                                final status = sub['status']?.toString();
                                final isTrial =
                                    status == 'trial' ||
                                    status == 'trial_expired';

                                final trialEndsStr = sub['trialEndsAt'];
                                final trialEndsAt = trialEndsStr != null
                                    ? DateTime.tryParse(trialEndsStr)
                                    : null;

                                final nextBillingStr = sub['nextBillingDate'];
                                final nextBillingDate = nextBillingStr != null
                                    ? DateTime.tryParse(nextBillingStr)
                                    : null;

                                final today = DateTime.now();
                                final startOfToday = DateTime(
                                  today.year,
                                  today.month,
                                  today.day,
                                );

                                int daysLeft = 0;
                                bool trialEnded = false;
                                bool subEnded = false;

                                if (isTrial) {
                                  if (trialEndsAt != null) {
                                    final endOfTrial = DateTime(
                                      trialEndsAt.year,
                                      trialEndsAt.month,
                                      trialEndsAt.day,
                                    );
                                    daysLeft = endOfTrial
                                        .difference(startOfToday)
                                        .inDays;
                                  }
                                  trialEnded =
                                      daysLeft < 0 ||
                                      status == 'trial_expired' ||
                                      status == 'past_due' ||
                                      status == 'expired';
                                } else {
                                  if (nextBillingDate != null) {
                                    final endOfSub = DateTime(
                                      nextBillingDate.year,
                                      nextBillingDate.month,
                                      nextBillingDate.day,
                                    );
                                    daysLeft = endOfSub
                                        .difference(startOfToday)
                                        .inDays;
                                  }
                                  subEnded =
                                      daysLeft < 0 ||
                                      status == 'past_due' ||
                                      status == 'expired';
                                }

                                if (!trialEnded && !subEnded && daysLeft > 7) {
                                  return const SizedBox.shrink();
                                }

                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.05,
                                        ),
                                        blurRadius: 10,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.workspace_premium,
                                        color: Colors.orange.shade600,
                                        size: 28,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              planName,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16,
                                              ),
                                            ),
                                            if (isTrial) ...[
                                              if (trialEnded)
                                                Text(
                                                  'Your Trial Ended',
                                                  style: TextStyle(
                                                    color: Colors.red.shade600,
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                )
                                              else if (trialEndsAt != null)
                                                Text(
                                                  'Trial ends on ${_formatDate(trialEndsAt)}',
                                                  style: TextStyle(
                                                    color: Colors.grey.shade600,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                            ] else ...[
                                              if (subEnded)
                                                Text(
                                                  'Your Subscription Ended',
                                                  style: TextStyle(
                                                    color: Colors.red.shade600,
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                )
                                              else if (nextBillingDate != null)
                                                Text(
                                                  'Renews on ${_formatDate(nextBillingDate)}',
                                                  style: TextStyle(
                                                    color: Colors.grey.shade600,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      if (!trialEnded &&
                                          !subEnded &&
                                          daysLeft >= 0)
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 6,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.orange.shade50,
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          child: Text(
                                            '$daysLeft Days Left',
                                            style: TextStyle(
                                              color: Colors.orange.shade800,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                      const SizedBox(width: 8),
                                      ElevatedButton.icon(
                                        onPressed: () {},
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(
                                            0xFF1F2E27,
                                          ),
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 8,
                                          ),
                                        ),
                                        icon: const Icon(
                                          Icons.star_border,
                                          size: 16,
                                        ),
                                        label: const Text(
                                          'Upgrade Plan',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Overview Header
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Overview',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1F2E27),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => _showMonthPicker(context, ref),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.calendar_today,
                                        size: 14,
                                        color: Colors.grey.shade700,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        _formatMonthYear(
                                          ref.watch(
                                            selectedAnalyticsMonthProvider,
                                          ),
                                        ),
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade800,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Icon(
                                        Icons.keyboard_arrow_down,
                                        size: 16,
                                        color: Colors.grey.shade700,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // 2x2 Grid
                          Row(
                            children: [
                              Expanded(
                                child: _buildStatCard(
                                  icon: Icons.people,
                                  iconColor: Colors.teal,
                                  iconBg: Colors.teal.shade50,
                                  title: 'Total Students',
                                  value: '${overview['totalStudents'] ?? 0}',
                                  growth: overview['studentsGrowth'] ?? 0,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildStatCard(
                                  icon: Icons.badge,
                                  iconColor: Colors.blueGrey,
                                  iconBg: Colors.blueGrey.shade50,
                                  title: 'Total Teachers',
                                  value: '${overview['totalTeachers'] ?? 0}',
                                  growth: overview['teachersGrowth'],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildStatCard(
                                  icon: Icons.attach_money,
                                  iconColor: Colors.amber.shade700,
                                  iconBg: Colors.amber.shade50,
                                  title: 'Fees Collected',
                                  value: '₹${overview['feesCollected'] ?? 0}',
                                  growth: overview['feesCollectedGrowth'] ?? 0,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildStatCard(
                                  icon: Icons.warning_amber_rounded,
                                  iconColor: Colors.red.shade700,
                                  iconBg: Colors.red.shade50,
                                  title: 'Fees Pending',
                                  value: '₹${overview['feesPending'] ?? 0}',
                                  growth: overview['feesPendingGrowth'] ?? 0,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Quick Actions Row
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _buildActionBtn(
                                  Icons.people,
                                  'Students',
                                  onTap: () {
                                    final appShell = context
                                        .findAncestorStateOfType<
                                          AppShellState
                                        >();
                                    if (appShell != null) {
                                      appShell.switchTab(
                                        1,
                                      ); // Students tab index
                                    } else {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              const StudentsScreen(),
                                        ),
                                      );
                                    }
                                  },
                                ),
                                _buildActionBtn(
                                  Icons.badge,
                                  'Teachers',
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => const TeachersScreen(),
                                      ),
                                    );
                                  },
                                ),
                                _buildActionBtn(
                                  Icons.currency_rupee,
                                  'Fees',
                                  onTap: () {
                                    final appShell = context
                                        .findAncestorStateOfType<
                                          AppShellState
                                        >();
                                    if (appShell != null) {
                                      appShell.switchTab(2); // Fees tab index
                                    } else {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              const FeesManagementScreen(),
                                        ),
                                      );
                                    }
                                  },
                                ),
                                _buildActionBtn(
                                  Icons.payment,
                                  'Add Payment',
                                  onTap: () {
                                    final appShell = context
                                        .findAncestorStateOfType<
                                          AppShellState
                                        >();
                                    if (appShell != null) {
                                      appShell.switchTab(2); // Fees tab index
                                    } else {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              const FeesManagementScreen(),
                                        ),
                                      );
                                    }
                                  },
                                ),
                                _buildActionBtn(
                                  Icons.bar_chart,
                                  'Reports',
                                  onTap: () {
                                    final appShell = context
                                        .findAncestorStateOfType<
                                          AppShellState
                                        >();
                                    if (appShell != null) {
                                      appShell.switchTab(
                                        3,
                                      ); // Reports tab index
                                    } else {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => const ReportsScreen(),
                                        ),
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Fees Overview (Pie Chart)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Expanded(
                                      child: Text(
                                        'Fees Overview',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                SizedBox(
                                  height: 100,
                                  child: _buildFeesPieChart(
                                    dash['feesChart'] ?? {},
                                  ),
                                ),
                                const SizedBox(height: 16),
                                _buildFeeLegend(dash['feesChart'] ?? {}),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Upcoming Schedule
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Upcoming Schedule',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const BatchesScreen(),
                                    ),
                                  );
                                },
                                child: Row(
                                  children: [
                                    const Text(
                                      'View All',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                    Icon(
                                      Icons.arrow_forward,
                                      size: 14,
                                      color: AppColors.textPrimary,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildUpcomingScheduleList(
                            dash['upcomingSchedule'] as List<dynamic>? ?? [],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String value,
    required dynamic growth,
  }) {
    int g = growth is num ? growth.toInt() : 0;
    bool isPositive = g >= 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 22,
              color: Color(0xFF1F2E27),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                color: isPositive ? Colors.green : Colors.red,
                size: 12,
              ),
              Text(
                '${g.abs()}% ',
                style: TextStyle(
                  color: isPositive ? Colors.green : Colors.red,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'vs last month',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label, {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF1F2E27), size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1F2E27),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeesPieChart(Map<String, dynamic> feesData) {
    double collected = (feesData['collected'] ?? 0).toDouble();
    double pending = (feesData['pending'] ?? 0).toDouble();
    double total = collected + pending;

    if (total == 0) {
      return const Center(
        child: Text('No Data', style: TextStyle(fontSize: 10)),
      );
    }

    return Stack(
      alignment: Alignment.center,
      children: [
        PieChart(
          PieChartData(
            sectionsSpace: 2,
            centerSpaceRadius: 35,
            sections: [
              PieChartSectionData(
                color: Colors.green,
                value: collected,
                title: '',
                radius: 12,
              ),
              PieChartSectionData(
                color: Colors.red,
                value: pending,
                title: '',
                radius: 12,
              ),
            ],
          ),
        ),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Total',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
            Text(
              '₹${total.toInt()}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFeeLegend(Map<String, dynamic> feesData) {
    double collected = (feesData['collected'] ?? 0).toDouble();
    double pending = (feesData['pending'] ?? 0).toDouble();
    double total = collected + pending;

    int collPct = total > 0 ? ((collected / total) * 100).round() : 0;
    int pendPct = total > 0 ? ((pending / total) * 100).round() : 0;

    return Column(
      children: [
        _buildLegendRow(
          Colors.green,
          'Collected',
          '₹${collected.toInt()}',
          '$collPct%',
        ),
        const SizedBox(height: 8),
        _buildLegendRow(
          Colors.red,
          'Pending',
          '₹${pending.toInt()}',
          '$pendPct%',
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const FeesManagementScreen()),
            );
          },
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              const Text(
                'View Details',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                  color: Color(0xFF1F2E27),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(
                Icons.arrow_forward,
                size: 10,
                color: Color(0xFF1F2E27),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLegendRow(Color color, String label, String amount, String pct) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
        ),
        const Spacer(),
        Text(
          amount,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
        ),
        const SizedBox(width: 4),
        Text(
          '($pct)',
          style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
        ),
      ],
    );
  }

  Widget _buildUpcomingScheduleList(List<dynamic> schedules) {
    if (schedules.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: Text('No schedule for today')),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: schedules.map((schedule) {
          final batchName = schedule['batchName']?.toString() ?? 'Batch';
          final subjectName = schedule['subjectName']?.toString() ?? 'Subject';
          final teacherName = schedule['teacherName']?.toString() ?? 'Teacher';

          final startTime = schedule['startTime']?.toString() ?? '';
          final endTime = schedule['endTime']?.toString() ?? '';

          // Basic formatting to chop seconds if it's like 09:00:00
          String formatTime(String t) {
            if (t.length >= 5) return t.substring(0, 5);
            return t;
          }

          final timeStr = '${formatTime(startTime)} - ${formatTime(endTime)}';

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.schedule,
                    color: Colors.blue.shade700,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$batchName • $subjectName',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Color(0xFF1F2E27),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$teacherName | $timeStr',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
