import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_colors.dart';
import '../../providers/management_providers.dart' as mgmt;
import 'student_report_screen.dart';
import '../../services/api_service.dart';
import '../../widgets/record_payment_bottom_sheet.dart';
import 'students_screen.dart';
import '../../widgets/payment_history_row.dart';

class StudentDetailsScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> student;
  final int initialTabIndex;

  const StudentDetailsScreen({
    super.key,
    required this.student,
    this.initialTabIndex = 0,
  });

  @override
  ConsumerState<StudentDetailsScreen> createState() =>
      _StudentDetailsScreenState();
}

class _StudentDetailsScreenState extends ConsumerState<StudentDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.student;
    final studentId = s['id'] as int;

    // Fetch detailed data from backend
    final detailsAsync = ref.watch(mgmt.studentDetailsProvider(studentId));
    final details = detailsAsync.value;
    final isLoading = detailsAsync.isLoading;
    final hasError = detailsAsync.hasError;

    final fullName = s['fullName']?.toString() ?? 'Unknown Student';
    final rollNo = s['rollNo']?.toString() ?? 'N/A';
    final grade = s['grade']?.toString() ?? 'N/A';
    final batchName = s['batchName']?.toString() ?? 'N/A';
    final attendance = num.tryParse(s['attendance']?.toString() ?? '0') ?? 0;
    // Prefer the freshly-computed pending amount from GET .../details (the
    // same value the Fees tab below shows) over the value this screen was
    // opened with, which came from the students list and can be stale the
    // moment a payment changes it — e.g. right after recording a payment
    // that fully (or over-) pays the student's fee.
    final detailsPending = details?['fees']?['overview']?['pending'];
    final pendingFees = detailsPending is num
        ? detailsPending
        : num.tryParse(s['pendingFees']?.toString() ?? '0') ?? 0;

    final tabBar = TabBar(
      controller: _tabController,
      isScrollable: true,
      tabAlignment: TabAlignment.start,
      labelColor: AppColors.primary,
      unselectedLabelColor: Colors.grey,
      indicatorColor: AppColors.primary,
      indicatorWeight: 3,
      tabs: const [
        Tab(text: 'Overview'),
        Tab(text: 'Academics'),
        Tab(text: 'Attendance'),
        Tab(text: 'Fees'),
      ],
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Student Details',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () =>
                showAddStudentDialog(context, ref, student: widget.student),
          ),
        ],
      ),
      body: NestedScrollView(
        // ── Outer scroll owns the parallax header ──────────────────────
        headerSliverBuilder: (BuildContext context, bool innerBoxIsScrolled) {
          return [
            // SliverOverlapAbsorber is the official Flutter-recommended way
            // to coordinate the outer SliverAppBar with inner scrollables.
            SliverOverlapAbsorber(
              handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
              sliver: SliverAppBar(
                expandedHeight: 320,
                automaticallyImplyLeading: false,
                backgroundColor: AppColors.background,
                pinned: true,
                toolbarHeight: 0,
                collapsedHeight: 0,
                elevation: 0,
                scrolledUnderElevation: 0,
                forceElevated: innerBoxIsScrolled,
                flexibleSpace: FlexibleSpaceBar(
                  collapseMode: CollapseMode.parallax,
                  background: _buildHeader(
                    studentId: studentId,
                    fullName: fullName,
                    rollNo: rollNo,
                    grade: grade,
                    batchName: batchName,
                    attendance: attendance,
                    pendingFees: pendingFees,
                  ),
                ),
                // Tab bar is part of the SliverAppBar so it's absorbed too
                bottom: PreferredSize(
                  // Add 3px extra so the indicator line is not clipped
                  preferredSize: Size.fromHeight(
                    tabBar.preferredSize.height + 3,
                  ),
                  child: Container(color: Colors.white, child: tabBar),
                ),
              ),
            ),
          ];
        },

        // ── Inner body: TabBarView, each tab is its own scroll ─────────
        body: TabBarView(
          controller: _tabController,
          children: [
            _TabPage(
              key: const PageStorageKey('overview'),
              child: _buildOverviewContent(s),
            ),
            _TabPage(
              key: const PageStorageKey('academics'),
              child: _buildAcademicsContent(details, isLoading, hasError),
            ),
            _TabPage(
              key: const PageStorageKey('attendance'),
              child: _buildAttendanceContent(details, isLoading, hasError),
            ),
            _TabPage(
              key: const PageStorageKey('fees'),
              child: _buildFeesContent(s, details, isLoading, hasError),
            ),
          ],
        ),
      ),
    );
  }

  // ── Tab page wrapper (injects the overlap so content starts below app bar)
  // ─────────────────────────────────────────────────────────────────────────
  // ── Header content ────────────────────────────────────────────────────────
  Widget _buildHeader({
    required int studentId,
    required String fullName,
    required String rollNo,
    required String grade,
    required String batchName,
    required num attendance,
    required num pendingFees,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Student card over green strip
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(height: 60, color: AppColors.primaryDark),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        color: AppColors.successLight,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person,
                        size: 40,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  fullName,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primaryDark,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.successLight,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'Active',
                                  style: TextStyle(
                                    color: AppColors.success,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Roll No: $rollNo  •  Class $grade',
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Batch: $batchName',
                            style: TextStyle(
                              color: Colors.grey.shade700,
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
          ],
        ),

        const SizedBox(height: 16),

        // Metrics
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  Icons.school,
                  '${attendance.toInt()}%',
                  'Attendance',
                  Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  Icons.warning_amber_rounded,
                  '₹$pendingFees',
                  'Fees Pending',
                  Colors.red,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Quick actions
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _buildActionIcon(
                Icons.account_balance_wallet_outlined,
                'Add Fees',
                onTap: () => showRecordPaymentBottomSheet(
                  context,
                  ref,
                  prefillStudentId: studentId,
                ),
              ),
              const SizedBox(width: 8),
              _buildActionIcon(
                Icons.bar_chart,
                'View Reports',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => Consumer(
                        builder: (context, ref, _) => StudentReportScreen(
                          student: widget.student,
                          detailsAsync: ref.watch(
                            mgmt.studentDetailsProvider(studentId),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 8),
              Builder(
                builder: (context) {
                  final key = GlobalKey();
                  return _buildActionIcon(
                    Icons.more_horiz,
                    'More',
                    key: key,
                    onTap: () async {
                      final box =
                          key.currentContext?.findRenderObject() as RenderBox?;
                      if (box == null) return;
                      final offset = box.localToGlobal(Offset.zero);
                      final selected = await showMenu<String>(
                        context: context,
                        position: RelativeRect.fromLTRB(
                          offset.dx,
                          offset.dy + box.size.height + 4,
                          offset.dx + box.size.width,
                          offset.dy + box.size.height + 4,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        color: Colors.white,
                        elevation: 8,
                        items: [
                          PopupMenuItem(
                            value: 'message',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.chat_outlined,
                                  size: 20,
                                  color: Colors.green.shade600,
                                ),
                                const SizedBox(width: 12),
                                const Text(
                                  'Send Message',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'suspend',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.block,
                                  size: 20,
                                  color: Colors.red.shade600,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  'Suspend',
                                  style: TextStyle(
                                    color: Colors.red.shade600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'delete',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.delete_outline,
                                  size: 20,
                                  color: Colors.red.shade600,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  'Delete',
                                  style: TextStyle(
                                    color: Colors.red.shade600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                      if (!mounted) return;
                      if (selected == 'message') {
                        final rawPhone =
                            widget.student['phone']?.toString() ?? '';
                        // wa.me requires digits only (no +, spaces, dashes)
                        final phone = rawPhone.replaceAll(RegExp(r'\D'), '');
                        if (phone.isNotEmpty) {
                          final url = Uri.parse('https://wa.me/$phone');
                          await launchUrl(
                            url,
                            mode: LaunchMode.externalApplication,
                          );
                        }
                      } else if (selected == 'suspend') {
                        _confirmSuspend(context);
                      } else if (selected == 'delete') {
                        _confirmDelete(context);
                      }
                    },
                  );
                },
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
      ],
    );
  }

  // ── Overview tab content ──────────────────────────────────────────────────
  Widget _buildOverviewContent(Map<String, dynamic> s) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildInfoCard(
            title: 'Personal Information',
            icon: Icons.person,
            fields: {
              'Full Name': s['fullName']?.toString() ?? 'N/A',
              'Phone': s['phone']?.toString() ?? 'N/A',
            },
          ),
          const SizedBox(height: 16),
          _buildInfoCard(
            title: 'Parent / Guardian',
            icon: Icons.people,
            fields: {
              'Parent Name': s['parentName']?.toString() ?? 'N/A',
              'Parent Phone': s['parentPhone']?.toString() ?? 'N/A',
            },
          ),
          const SizedBox(height: 16),
          _buildInfoCard(
            title: 'Academic Information',
            icon: Icons.school,
            fields: {
              'Class': s['grade']?.toString() ?? 'N/A',
              'Batch': s['batchName']?.toString() ?? 'N/A',
              'Roll No': s['rollNo']?.toString() ?? 'N/A',
            },
          ),
        ],
      ),
    );
  }

  // ── Academics Tab ─────────────────────────────────────────────────────────
  Widget _buildAcademicsContent(
    Map<String, dynamic>? details,
    bool isLoading,
    bool hasError,
  ) {
    if (isLoading)
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: CircularProgressIndicator(),
        ),
      );
    if (hasError)
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Text(
            'Failed to load details',
            style: TextStyle(color: Colors.red),
          ),
        ),
      );

    final academics = details?['academics'] as Map<String, dynamic>?;
    final subjects = academics?['subjects'] as List<dynamic>? ?? [];
    final overallPct = academics?['overallPercentage']?.toString() ?? '0.0';
    final grade = academics?['grade']?.toString() ?? '-';

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Summary card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primaryDark, AppColors.primary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildSummaryItem('Overall', '$overallPct%', Icons.bar_chart),
                _buildSummaryItem('Grade', grade, Icons.grade),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Subject Performance',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: 12),
          if (subjects.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: Text('No test results found.')),
            )
          else
            ...subjects.map(
              (sub) => _buildSubjectCard(
                name: sub['name']?.toString() ?? 'Unknown',
                marks: (sub['marks'] as num?)?.toInt() ?? 0,
                total: (sub['total'] as num?)?.toInt() ?? 0,
                grade: sub['grade']?.toString() ?? '-',
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, IconData icon) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildSubjectCard({
    required String name,
    required int marks,
    required int total,
    required String grade,
  }) {
    final pct = total > 0 ? (marks / total) : 0.0;
    final color = pct >= 0.85
        ? Colors.green
        : pct >= 0.70
        ? Colors.orange
        : Colors.red;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$marks/$total',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  grade,
                  style: const TextStyle(
                    color: AppColors.primaryDark,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: Colors.grey.shade100,
              color: color,
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  // ── Attendance Tab ────────────────────────────────────────────────────────
  Widget _buildAttendanceContent(
    Map<String, dynamic>? details,
    bool isLoading,
    bool hasError,
  ) {
    if (isLoading)
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: CircularProgressIndicator(),
        ),
      );
    if (hasError)
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Text(
            'Failed to load details',
            style: TextStyle(color: Colors.red),
          ),
        ),
      );

    final attendance = details?['attendance'] as Map<String, dynamic>?;
    final totalDays = (attendance?['totalDays'] as num?)?.toInt() ?? 0;
    final presentDays = (attendance?['presentDays'] as num?)?.toInt() ?? 0;
    final absentDays = (attendance?['absentDays'] as num?)?.toInt() ?? 0;
    final monthlyData = attendance?['monthly'] as List<dynamic>? ?? [];

    final attPct = totalDays > 0 ? (presentDays / totalDays) * 100 : 0.0;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Big attendance ring card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 90,
                  height: 90,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CircularProgressIndicator(
                        value: totalDays > 0 ? presentDays / totalDays : 0,
                        strokeWidth: 10,
                        backgroundColor: Colors.grey.shade100,
                        color: attPct >= 75 ? Colors.green : Colors.orange,
                      ),
                      Center(
                        child: Text(
                          '${attPct.toInt()}%',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildAttStat(
                        'Present',
                        '$presentDays days',
                        Colors.green,
                      ),
                      const SizedBox(height: 8),
                      _buildAttStat('Absent', '$absentDays days', Colors.red),
                      const SizedBox(height: 8),
                      _buildAttStat(
                        'Total',
                        '$totalDays days',
                        Colors.blueGrey,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Monthly Breakdown',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: 12),
          if (monthlyData.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(child: Text('No attendance records found.')),
            )
          else
            ...monthlyData.map(
              (m) => _buildMonthRow(
                month: m['month']?.toString() ?? '',
                present: (m['present'] as num?)?.toInt() ?? 0,
                total: (m['total'] as num?)?.toInt() ?? 0,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAttStat(String label, String value, Color color) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildMonthRow({
    required String month,
    required int present,
    required int total,
  }) {
    final pct = total > 0 ? (present / total) : 0.0;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              month,
              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
            ),
          ),
          Text(
            '$present/$total days',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 60,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct,
                color: pct >= 0.75 ? Colors.green : Colors.orange,
                backgroundColor: Colors.grey.shade100,
                minHeight: 6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Fees Tab ──────────────────────────────────────────────────────────────
  Widget _buildFeesContent(
    Map<String, dynamic> s,
    Map<String, dynamic>? details,
    bool isLoading,
    bool hasError,
  ) {
    if (isLoading)
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: CircularProgressIndicator(),
        ),
      );
    if (hasError)
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(40),
          child: Text(
            'Failed to load details',
            style: TextStyle(color: Colors.red),
          ),
        ),
      );

    final feesData = details?['fees'] as Map<String, dynamic>?;
    final history = feesData?['history'] as List<dynamic>? ?? [];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Payment History',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                if (history.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(20),
                    child: Text('No payment history found.'),
                  )
                else
                  ...history.map(
                    (h) => PaymentHistoryRow(
                      date: h['date']?.toString() ?? '',
                      amount: h['amount']?.toString() ?? '0',
                      method: h['method']?.toString() ?? 'Cash',
                      receiptNo: h['receiptNo']?.toString() ?? '',
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ── Reusable small widgets ────────────────────────────────────────────────
  Widget _buildMetricCard(
    IconData icon,
    String value,
    String title,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionIcon(
    IconData icon,
    String label, {
    Key? key,
    VoidCallback? onTap,
  }) {
    return InkWell(
      key: key,
      onTap: onTap ?? () {},
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: 88,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 4),
            Icon(icon, color: Colors.grey.shade700, size: 22),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey.shade800,
                height: 1.3,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              softWrap: true,
            ),
          ],
        ),
      ),
    );
  }

  void _confirmSuspend(BuildContext context) {
    final studentName =
        widget.student['fullName']?.toString() ?? 'this student';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.block, color: Colors.red, size: 22),
            SizedBox(width: 8),
            Text('Suspend Student', style: TextStyle(fontSize: 17)),
          ],
        ),
        content: Text(
          'Are you sure you want to suspend $studentName?\n\nThey will not be able to login until unsuspended.',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final studentId = widget.student['id'] as int?;
              if (studentId == null) return;
              try {
                final api = ref.read(apiServiceProvider);
                final result = await mgmt.suspendStudent(api, studentId);
                final isSuspended = result['isSuspended'] as bool? ?? true;
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      isSuspended
                          ? '$studentName has been suspended.'
                          : '$studentName has been unsuspended.',
                    ),
                    backgroundColor: isSuspended ? Colors.red : Colors.green,
                  ),
                );
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(friendlyErrorMessage(e)),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Suspend'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    final studentName =
        widget.student['fullName']?.toString() ?? 'this student';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: Colors.red, size: 22),
            SizedBox(width: 8),
            Text('Delete Student', style: TextStyle(fontSize: 17)),
          ],
        ),
        content: Text(
          'Are you sure you want to delete $studentName?\n\n'
          'If they have no attendance, fee, or test history, their account '
          'is removed permanently. Otherwise it is deactivated (can no '
          'longer login) so that history stays intact.',
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final studentId = widget.student['id'] as int?;
              if (studentId == null) return;
              try {
                final api = ref.read(apiServiceProvider);
                final result = await mgmt.deleteStudent(api, studentId);
                final softDeleted = result['softDeleted'] as bool? ?? false;
                ref.invalidate(mgmt.studentsProvider);
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      softDeleted
                          ? '$studentName has been deactivated (history preserved).'
                          : '$studentName has been deleted.',
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
                Navigator.pop(context);
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(friendlyErrorMessage(e)),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required Map<String, String> fields,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 16, color: AppColors.primary),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...fields.entries.map(
            (e) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      e.key,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      e.value,
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Tab page that injects overlap so content starts below the pinned header ──
class _TabPage extends StatelessWidget {
  const _TabPage({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      // ClampingScrollPhysics = Android natural scroll (no bounce)
      physics: const ClampingScrollPhysics(),
      slivers: [
        // Injects the height of the absorbed SliverAppBar overlap
        SliverOverlapInjector(
          handle: NestedScrollView.sliverOverlapAbsorberHandleFor(context),
        ),
        // The actual tab content — fills remaining space, centers if small
        SliverFillRemaining(hasScrollBody: false, child: child),
      ],
    );
  }
}
