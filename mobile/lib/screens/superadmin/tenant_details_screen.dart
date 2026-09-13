import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/superadmin_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';

class TenantDetailsScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> tenant;
  const TenantDetailsScreen({super.key, required this.tenant});

  @override
  ConsumerState<TenantDetailsScreen> createState() =>
      _TenantDetailsScreenState();
}

class _TenantDetailsScreenState extends ConsumerState<TenantDetailsScreen> {
  String _selectedFilter = 'This Week';

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

  @override
  Widget build(BuildContext context) {
    final tenant = widget.tenant;
    final int id = tenant['id'];
    final String name = tenant['name'] ?? 'Unknown';
    final String? city = tenant['city']?.toString();
    final String status = tenant['status']?.toString() ?? 'unknown';

    final bool isActive = tenant['isActive'] == true;
    final String location =
        '${city != null && city.isNotEmpty ? '$city, ' : ''}Maharashtra';

    final dashboardAsync = ref.watch(tenantDashboardProvider(id));
    final subAsync = ref.watch(tenantSubscriptionProvider(id));

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: CustomScrollView(
        slivers: [
          // Custom App Bar (Dark Green)
          SliverAppBar(
            backgroundColor: const Color(0xFF1F2E27),
            expandedHeight: 100.0,
            floating: false,
            pinned: true,
            iconTheme: const IconThemeData(color: Colors.white),
            actions: [
              IconButton(
                icon: const Badge(
                  label: Text('3'),
                  child: Icon(Icons.notifications_none, color: Colors.white),
                ),
                onPressed: () {},
              ),
              IconButton(
                icon: const Icon(Icons.more_vert, color: Colors.white),
                onPressed: () {},
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.only(
                    left: 48.0,
                    right: 96.0,
                    top: 8.0,
                    bottom: 8.0,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.business,
                          color: Color(0xFF1F2E27),
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    name,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (isActive)
                                  Container(
                                    margin: const EdgeInsets.only(left: 8),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.green.withValues(
                                        alpha: 0.2,
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.green),
                                    ),
                                    child: const Text(
                                      'Active',
                                      style: TextStyle(
                                        color: Colors.green,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              location,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Subscription Banner
                  subAsync.when(
                    loading: () => const SizedBox(
                      height: 80,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (err, stack) => const SizedBox(),
                    data: (sub) {
                      final planName = sub['planName']?.toString() ?? 'N/A';
                      final isTrial = sub['status'] == 'trial';
                      final trialEndsStr = sub['trialEndsAt'];
                      final trialEndsAt = trialEndsStr != null
                          ? DateTime.tryParse(trialEndsStr)
                          : null;

                      int daysLeft = 0;
                      if (trialEndsAt != null) {
                        daysLeft = trialEndsAt
                            .difference(DateTime.now())
                            .inDays;
                      }

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
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
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    planName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  if (trialEndsAt != null)
                                    Text(
                                      'Trial ends on ${_formatDate(trialEndsAt)}',
                                      style: TextStyle(
                                        color: Colors.grey.shade600,
                                        fontSize: 12,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            if (isTrial && daysLeft >= 0)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.orange.shade50,
                                  borderRadius: BorderRadius.circular(8),
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
                                backgroundColor: const Color(0xFF1F2E27),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                              ),
                              icon: const Icon(Icons.star_border, size: 16),
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
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.grey.shade300),
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
                              'Today, ${_formatDate(DateTime.now())}',
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
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Dashboard Data
                  dashboardAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (err, stack) =>
                        Center(child: Text(friendlyErrorMessage(err))),
                    data: (dash) {
                      final overview = dash['overview'] ?? {};
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
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
                                _buildActionBtn(Icons.people, 'Students'),
                                _buildActionBtn(Icons.badge, 'Teachers'),
                                _buildActionBtn(Icons.currency_rupee, 'Fees'),
                                _buildActionBtn(Icons.payment, 'Add Payment'),
                                _buildActionBtn(Icons.bar_chart, 'Reports'),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Charts Row (Students vs Fees)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Students Overview (Line Chart)
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.03,
                                        ),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Expanded(
                                            child: Text(
                                              'Students Overview',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              border: Border.all(
                                                color: Colors.grey.shade300,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                            ),
                                            child: Row(
                                              children: [
                                                const Text(
                                                  'This Week',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                  ),
                                                ),
                                                const SizedBox(width: 4),
                                                Icon(
                                                  Icons.keyboard_arrow_down,
                                                  size: 12,
                                                  color: Colors.grey.shade700,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 24),
                                      SizedBox(
                                        height: 120,
                                        child: _buildStudentLineChart(
                                          dash['studentChart']
                                                  as List<dynamic>? ??
                                              [],
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'Total Students',
                                            style: TextStyle(
                                              color: Colors.grey.shade600,
                                              fontSize: 12,
                                            ),
                                          ),
                                          Text(
                                            '${overview['totalStudents'] ?? 0}',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Fees Overview (Pie Chart)
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.03,
                                        ),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
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
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Recent Activity
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Recent Activity',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              Row(
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
                            ],
                          ),
                          const SizedBox(height: 12),
                          _buildRecentActivityList(
                            dash['recentActivity'] as List<dynamic>? ?? [],
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
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
          Opacity(
            opacity: growth != null ? 1.0 : 0.0,
            child: Row(
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
          ),
        ],
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label) {
    return Column(
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
    );
  }

  Widget _buildStudentLineChart(List<dynamic> chartData) {
    if (chartData.isEmpty) {
      return const Center(
        child: Text('No Data', style: TextStyle(fontSize: 10)),
      );
    }

    List<FlSpot> spots = [];
    List<String> days = [];
    for (int i = 0; i < chartData.length; i++) {
      spots.add(FlSpot(i.toDouble(), (chartData[i]['count'] ?? 0).toDouble()));
      days.add(chartData[i]['day']?.toString().substring(0, 3) ?? '');
    }

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 1,
          getDrawingHorizontalLine: (value) =>
              FlLine(color: Colors.grey.shade200, strokeWidth: 1),
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 22,
              interval: 1,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= 0 && value.toInt() < days.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      days[value.toInt()],
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 10,
                      ),
                    ),
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
              reservedSize: 20,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toInt().toString(),
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 10),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: (chartData.length - 1).toDouble(),
        minY: 0,
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: false,
            color: const Color(0xFF1F2E27),
            barWidth: 2,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              color: const Color(0xFF1F2E27).withValues(alpha: 0.1),
            ),
          ),
        ],
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
        Row(
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
            const Icon(Icons.arrow_forward, size: 10, color: Color(0xFF1F2E27)),
          ],
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

  Widget _buildRecentActivityList(List<dynamic> activities) {
    if (activities.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: Text('No recent activity')),
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
        children: activities.map((act) {
          final action = act['action']?.toString() ?? 'unknown';
          IconData icon = Icons.info_outline;
          Color iconColor = Colors.blue;
          Color iconBg = Colors.blue.shade50;
          String text = 'Action performed';

          if (action.contains('student')) {
            icon = Icons.person_add;
            iconColor = Colors.teal;
            iconBg = Colors.teal.shade50;
            text = 'New student added';
          } else if (action.contains('payment')) {
            icon = Icons.currency_rupee;
            iconColor = Colors.amber.shade700;
            iconBg = Colors.amber.shade50;
            text = 'Payment received';
          }

          final dateStr = act['createdAt'] != null
              ? _formatDate(DateTime.tryParse(act['createdAt']))
              : 'N/A';

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        text,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        dateStr,
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 10,
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
