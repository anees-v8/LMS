import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_dropdown.dart';
import 'ranked_students_screen.dart';

class _SelectedBatchNotifier extends Notifier<int?> {
  @override
  int? build() => null;
  void set(int? value) => state = value;
}

final _selectedBatchProvider = NotifierProvider<_SelectedBatchNotifier, int?>(
  _SelectedBatchNotifier.new,
);

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedBatch = ref.watch(_selectedBatchProvider);
    final reportAsync = ref.watch(performanceReportProvider(selectedBatch));
    final batchesAsync = ref.watch(batchesProvider);

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
              padding: const EdgeInsets.only(
                left: 20.0,
                right: 20.0,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Performance Reports',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Batch-wise attendance and test scores',
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
                child: RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(performanceReportProvider(selectedBatch)),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16.0),
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Batch Analytics',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2E27),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Batch Filter
                        batchesAsync.when(
                          loading: () => const SizedBox.shrink(),
                          error: (_, _) => const SizedBox.shrink(),
                          data: (batches) {
                            return CustomDropdown<int?>(
                              label: 'Filter by Batch',
                              hint: 'All Batches',
                              value: selectedBatch,
                              prefixIcon: Icons.class_outlined,
                              options: [
                                const DropdownOption<int?>(
                                  value: null,
                                  label: 'All Batches',
                                ),
                                ...batches.cast<Map<String, dynamic>>().map(
                                  (b) => DropdownOption<int?>(
                                    value: b['id'] as int,
                                    label: b['name']?.toString() ?? '',
                                  ),
                                ),
                              ],
                              onChanged: (v) => ref
                                  .read(_selectedBatchProvider.notifier)
                                  .set(v),
                            );
                          },
                        ),
                        const SizedBox(height: 24),

                        // Analytics Content
                        reportAsync.when(
                          loading: () => const Center(
                            child: Padding(
                              padding: EdgeInsets.all(32),
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          error: (err, stack) => Center(
                            child: Text(
                              friendlyErrorMessage(err),
                              style: const TextStyle(color: Colors.red),
                            ),
                          ),
                          data: (report) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // 4 Metric Cards
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildMetricCard(
                                        'Avg Attendance',
                                        report['avgAttendance'],
                                        Icons.event_available,
                                        const Color(0xFF2E6656),
                                        isPercentage: true,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _buildMetricCard(
                                        'Avg Marks',
                                        report['avgMarksPct'],
                                        Icons.star,
                                        const Color(0xFFA87D26),
                                        isPercentage: true,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildMetricCard(
                                        'Total Tests',
                                        report['totalTests'],
                                        Icons.assignment_outlined,
                                        const Color(0xFF6B4CA4),
                                        isPercentage: false,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _buildMetricCard(
                                        'Total Classes',
                                        report['totalClasses'],
                                        Icons.menu_book,
                                        const Color(0xFF2E7D32),
                                        isPercentage: false,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),

                                // Top Performers
                                _buildSectionTitle(
                                  Icons.emoji_events,
                                  'Top Performers (Hall of Fame)',
                                  Colors.orange.shade700,
                                  onTapViewAll: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => RankedStudentsScreen(
                                          title:
                                              'Top Performers (Hall of Fame)',
                                          students:
                                              report['topPerformers']
                                                  as List<dynamic>? ??
                                              [],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(height: 12),
                                _buildTopPerformers(
                                  (report['topPerformers'] as List<dynamic>? ??
                                          [])
                                      .take(3)
                                      .toList(),
                                ),
                                const SizedBox(height: 24),

                                // Attention Required
                                _buildSectionTitle(
                                  Icons.warning_amber_rounded,
                                  'Students Needing Attention',
                                  Colors.red.shade700,
                                  onTapViewAll: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => RankedStudentsScreen(
                                          title: 'Students Needing Attention',
                                          students:
                                              report['needingAttention']
                                                  as List<dynamic>? ??
                                              [],
                                          isAttention: true,
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                const SizedBox(height: 12),
                                _buildAttentionList(
                                  (report['needingAttention']
                                              as List<dynamic>? ??
                                          [])
                                      .take(3)
                                      .toList(),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 24),

                        // Info Box
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.description_outlined,
                                color: Colors.green.shade800,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  "Based on attendance records and test results entered for this institute.",
                                  style: TextStyle(
                                    color: Colors.green.shade900,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(
    IconData icon,
    String title,
    Color iconColor, {
    VoidCallback? onTapViewAll,
  }) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 22),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2E27),
            ),
          ),
        ),
        if (onTapViewAll != null)
          GestureDetector(
            onTap: onTapViewAll,
            child: const Text(
              'View All',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2E6656),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMetricCard(
    String title,
    dynamic value,
    IconData icon,
    Color color, {
    required bool isPercentage,
  }) {
    final displayValue = value == null ? '0' : value.toString();
    final suffix = isPercentage && displayValue != '0' ? '%' : '';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 12),
          Text(
            '$displayValue$suffix',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF1F2E27),
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            value == null ? 'No data' : 'Verified',
            style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildTopPerformers(List<dynamic> performers) {
    if (performers.isEmpty) {
      return const Card(
        color: Colors.white,
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('No test data available for top performers.'),
        ),
      );
    }

    // Sort logic handled in backend, just layout 2-1-3 if 3 exist, otherwise linear.
    // For mobile, a horizontal scroll or a row if 3 fit.
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (performers.length > 1)
            _buildRankCard(performers[1], 2, Colors.grey.shade300, 140),
          const SizedBox(width: 12),
          if (performers.isNotEmpty)
            _buildRankCard(performers[0], 1, Colors.amber.shade400, 160),
          const SizedBox(width: 12),
          if (performers.length > 2)
            _buildRankCard(performers[2], 3, Colors.brown.shade300, 140),
        ],
      ),
    );
  }

  Widget _buildRankCard(
    Map<String, dynamic> student,
    int rank,
    Color badgeColor,
    double height,
  ) {
    return Container(
      width: 110,
      height: height,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: rank == 1 ? const Color(0xFFFFFDF5) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: rank == 1 ? Colors.amber.shade200 : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              CircleAvatar(
                radius: rank == 1 ? 28 : 24,
                backgroundColor: badgeColor.withValues(alpha: 0.2),
                child: Icon(
                  Icons.person,
                  color: badgeColor.withValues(alpha: 0.8),
                  size: rank == 1 ? 36 : 28,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                student['fullName'] ?? '',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                '${student['avgMarksPct']}%',
                style: const TextStyle(
                  color: Color(0xFF2E6656),
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          Positioned(
            top: -20,
            child: CircleAvatar(
              radius: 12,
              backgroundColor: badgeColor,
              child: Text(
                '$rank',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttentionList(List<dynamic> students) {
    if (students.isEmpty) {
      return const Card(
        color: Colors.white,
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('No students need immediate attention.'),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5F5), // Light red bg
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Column(
        children: students
            .map((s) => _buildAttentionTile(s as Map<String, dynamic>))
            .toList(),
      ),
    );
  }

  Widget _buildAttentionTile(Map<String, dynamic> student) {
    final name = student['fullName'] ?? 'Unknown';
    final initials = name
        .toString()
        .split(' ')
        .take(2)
        .map((e) => e.isNotEmpty ? e[0] : '')
        .join()
        .toUpperCase();
    final att = student['avgAttendance'];
    final marks = student['avgMarksPct'];

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.red.shade100,
                child: Text(
                  initials,
                  style: TextStyle(
                    color: Colors.red.shade700,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: Color(0xFF1F2E27),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${student['grade'] ?? ''} • Roll ${student['rollNo'] ?? 'N/A'}',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'Attendance',
                    style: TextStyle(color: Colors.grey, fontSize: 10),
                  ),
                  Text(
                    att == null ? 'N/A' : '$att%',
                    style: TextStyle(
                      color: att != null && att < 75
                          ? Colors.red
                          : Colors.black87,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'Marks (Avg)',
                    style: TextStyle(color: Colors.grey, fontSize: 10),
                  ),
                  Text(
                    marks == null ? 'N/A' : '$marks%',
                    style: TextStyle(
                      color: marks != null && marks < 60
                          ? Colors.red
                          : Colors.black87,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
            ],
          ),
        ),
        Divider(height: 1, color: Colors.red.shade50),
      ],
    );
  }
}
