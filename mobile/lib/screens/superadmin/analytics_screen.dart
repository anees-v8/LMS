import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/dashboard_provider.dart';
import '../../services/api_service.dart';
import 'tenants_screen.dart';
import 'plans_screen.dart';
import 'subscriptions_screen.dart';
import 'leads_screen.dart';
import 'broadcast_admins_screen.dart';
import 'notifications_screen.dart';
import '../../widgets/analytics_top_card.dart';
import '../../widgets/quick_action_icon.dart';
import '../../widgets/management_overview_tile.dart';
import '../../widgets/analytics_line_chart.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.asset(
                  'assets/images/logo.png',
                  height: 34,
                  width: 34,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Super Admin',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Campus',
                  style: TextStyle(color: AppColors.primary, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppColors.textPrimary),
            onPressed: () {},
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(
                  Icons.notifications_outlined,
                  color: AppColors.textPrimary,
                ),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const NotificationsScreen(),
                  ),
                ),
              ),
              Positioned(
                right: 8,
                top: 12,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                  ),
                  child: const Text(
                    '8',
                    style: TextStyle(
                      color: AppColors.surface,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: analyticsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(
            child: Text(
              friendlyErrorMessage(err),
              style: const TextStyle(color: AppColors.error),
            ),
          ),
          data: (data) {
            final totalTenants = data['totalTenants']?.toString() ?? '0';
            final activeTenants = data['activeTenants']?.toString() ?? '0';
            final totalStudents = data['totalStudents']?.toString() ?? '0';
            final mrr = '₹${data['mrr'] ?? 0}';
            final onTrial = data['onTrial']?.toString() ?? '0';
            final growthTotalTenants =
                data['growthTotalTenants']?.toString() ?? '+0 this month';
            final growthTotalStudents =
                data['growthTotalStudents']?.toString() ?? '+0% this month';
            final growthActiveTenants =
                data['growthActiveTenants']?.toString() ?? '+0% this month';
            final growthRevenue =
                data['growthRevenue']?.toString() ?? '+0% this month';

            final graphDataRaw = data['graphData'] as List<dynamic>? ?? [];
            final spotsStudents = <FlSpot>[];
            final spotsInstitutes = <FlSpot>[];
            final spotsRevenue = <FlSpot>[];

            for (var pt in graphDataRaw) {
              final day = (pt['day'] as num).toDouble();
              final students = (pt['students'] as num).toDouble();
              final institutes = (pt['institutes'] as num).toDouble();
              final revenue = (pt['revenue'] as num).toDouble();

              spotsStudents.add(FlSpot(day, students));
              spotsInstitutes.add(FlSpot(day, institutes));
              spotsRevenue.add(FlSpot(day, revenue));
            }
            final now = DateTime.now();
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
            final todayFormatted =
                '${now.day} ${months[now.month - 1]} ${now.year}';

            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(dashboardProvider),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome Section
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Welcome back, Super Admin 👋',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Here\'s what\'s happening with your platform today.',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.borderMedium),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.calendar_today,
                                  size: 14,
                                  color: AppColors.info,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  todayFormatted,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Top Stat Cards (Horizontal Scroll)
                    SizedBox(
                      height: 155,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          AnalyticsTopCard(
                            title: 'Total Institutes',
                            value: totalTenants,
                            subtitle: growthTotalTenants,
                            icon: Icons.business,
                            bgColor: AppColors.successLight,
                            iconColor: AppColors.success,
                          ),
                          AnalyticsTopCard(
                            title: 'Total Students',
                            value: totalStudents,
                            subtitle: growthTotalStudents,
                            icon: Icons.school,
                            bgColor: AppColors.purpleLight,
                            iconColor: AppColors.purple,
                          ),
                          AnalyticsTopCard(
                            title: 'Active Institutes',
                            value: activeTenants,
                            subtitle: growthActiveTenants,
                            icon: Icons.bar_chart,
                            bgColor: AppColors.warningLight,
                            iconColor: AppColors.warning,
                          ),
                          AnalyticsTopCard(
                            title: 'Total Revenue',
                            value: mrr,
                            subtitle: growthRevenue,
                            icon: Icons.account_balance_wallet,
                            bgColor: AppColors.infoLight,
                            iconColor: AppColors.info,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Platform Overview Graph
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: AnalyticsLineChart(
                        spotsStudents: spotsStudents,
                        spotsInstitutes: spotsInstitutes,
                        spotsRevenue: spotsRevenue,
                        selectedMonth: ref.watch(
                          selectedAnalyticsMonthProvider,
                        ),
                        onMonthTap: () async {
                          final current = ref.read(
                            selectedAnalyticsMonthProvider,
                          );
                          await showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (context) {
                              return Container(
                                padding: const EdgeInsets.all(16),
                                height: 350,
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.vertical(
                                    top: Radius.circular(24),
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 4,
                                      margin: const EdgeInsets.only(bottom: 12),
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade300,
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    ),
                                    const Text(
                                      'Select Month',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF1F2E27),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Expanded(
                                      child: ListView.builder(
                                        itemCount: 12,
                                        itemBuilder: (context, index) {
                                          final date = DateTime(
                                            current.year,
                                            index + 1,
                                            1,
                                          );
                                          final isSelected =
                                              current.month == date.month;
                                          const monthNames = [
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
                                            title: Text(monthNames[index]),
                                            trailing: isSelected
                                                ? const Icon(
                                                    Icons.check,
                                                    color: AppColors.success,
                                                  )
                                                : null,
                                            onTap: () {
                                              ref
                                                      .read(
                                                        selectedAnalyticsMonthProvider
                                                            .notifier,
                                                      )
                                                      .state =
                                                  date;
                                              Navigator.pop(context);
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
                        },
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick Actions
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.0),
                      child: Text(
                        'Quick Actions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 100,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          QuickActionIcon(
                            label: 'Institutes',
                            icon: Icons.business,
                            iconColor: AppColors.success,
                            destination: const TenantsScreen(),
                          ),
                          QuickActionIcon(
                            label: 'Plans',
                            icon: Icons.card_membership,
                            iconColor: AppColors.purple,
                            destination: const PlansScreen(),
                          ),
                          QuickActionIcon(
                            label: 'Subscriptions',
                            icon: Icons.receipt_long,
                            iconColor: AppColors.warning,
                            destination: const SubscriptionsScreen(),
                          ),
                          QuickActionIcon(
                            label: 'Leads',
                            icon: Icons.inbox,
                            iconColor: AppColors.info,
                            destination: const LeadsScreen(),
                          ),
                          QuickActionIcon(
                            label: 'Send Notice',
                            icon: Icons.campaign,
                            iconColor: AppColors.pink,
                            destination: const BroadcastAdminsScreen(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Management Overview
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.0),
                      child: Text(
                        'Management Overview',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: GridView.count(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: 2.2,
                        children: [
                          ManagementOverviewTile(
                            title: 'Institutes',
                            subtitle: 'Manage all institutes',
                            value: totalTenants,
                            icon: Icons.business,
                            bgColor: AppColors.successLight,
                            iconColor: AppColors.success,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const TenantsScreen(),
                              ),
                            ),
                          ),
                          ManagementOverviewTile(
                            title: 'Active',
                            subtitle: 'Active institutes',
                            value: activeTenants,
                            icon: Icons.check_circle,
                            bgColor: AppColors.warningLight,
                            iconColor: AppColors.warning,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const TenantsScreen(
                                  initialFilter: 'active',
                                ),
                              ),
                            ),
                          ),
                          ManagementOverviewTile(
                            title: 'Students',
                            subtitle: 'Manage all students',
                            value: totalStudents,
                            icon: Icons.people,
                            bgColor: AppColors.purpleLight,
                            iconColor: AppColors.purple,
                            onTap: () =>
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Dedicated tab not available yet',
                                    ),
                                  ),
                                ),
                          ),
                          ManagementOverviewTile(
                            title: 'On Trial',
                            subtitle: 'Institutes on trial',
                            value: onTrial,
                            icon: Icons.hourglass_top,
                            bgColor: AppColors.lightBlueBackground,
                            iconColor: AppColors.lightBlue,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    const TenantsScreen(initialFilter: 'trial'),
                              ),
                            ),
                          ),
                          ManagementOverviewTile(
                            title: 'Payments',
                            subtitle: 'Track all payments',
                            value: mrr,
                            icon: Icons.account_balance_wallet,
                            bgColor: AppColors.successLight,
                            iconColor: AppColors.success,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const SubscriptionsScreen(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
