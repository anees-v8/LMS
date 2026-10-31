import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';

class AdminAttendanceScreen extends ConsumerStatefulWidget {
  const AdminAttendanceScreen({super.key});

  @override
  ConsumerState<AdminAttendanceScreen> createState() => _AdminAttendanceScreenState();
}

class _AdminAttendanceScreenState extends ConsumerState<AdminAttendanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = true;
  String? _error;

  Map<String, dynamic>? _attendanceData;
  List<dynamic> _batchSummaries = [];
  List<dynamic> _absentees = [];
  List<dynamic> _defaulters = [];
  Map<String, dynamic>? _overallSummary;

  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAttendance();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  bool _isToday(DateTime dt) {
    final now = DateTime.now();
    return dt.year == now.year && dt.month == now.month && dt.day == now.day;
  }

  bool _isFutureDate(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(dt.year, dt.month, dt.day);
    return target.isAfter(today);
  }

  String _formatDateDisplay(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(dt.year, dt.month, dt.day);
    final diff = target.difference(today).inDays;

    final months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final dateFormatted = '${dt.day} ${months[dt.month]} ${dt.year}';

    if (diff == 0) return 'Today, $dateFormatted';
    if (diff == -1) return 'Yesterday, $dateFormatted';
    if (diff == 1) return 'Tomorrow, $dateFormatted';

    final weekdays = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return '${weekdays[dt.weekday]}, $dateFormatted';
  }

  Future<void> _loadAttendance() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final dateStr = _formatDate(_selectedDate);
      final api = ref.read(apiServiceProvider);
      final res = await api.get('/admin/attendance?date=$dateStr');

      if (mounted) {
        setState(() {
          _attendanceData = res as Map<String, dynamic>;
          _overallSummary = _attendanceData?['overallSummary'] as Map<String, dynamic>?;
          _batchSummaries = (_attendanceData?['batchSummaries'] as List<dynamic>?) ?? [];
          _absentees = (_attendanceData?['absentees'] as List<dynamic>?) ?? [];
          _defaulters = (_attendanceData?['defaulters'] as List<dynamic>?) ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = friendlyErrorMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2024, 1, 1),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF1F2E27),
              onPrimary: Colors.white,
              onSurface: Color(0xFF1F2E27),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _loadAttendance();
    }
  }

  Future<void> _launchWhatsApp(String url) async {
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Parent phone number not available')),
      );
      return;
    }

    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open WhatsApp on this device')),
        );
      }
    }
  }

  void _showBatchRegisterSheet(Map<String, dynamic> batch) {
    final batchId = batch['batchId'];
    final batchName = batch['batchName'] ?? 'Batch Register';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BatchRegisterBottomSheet(
        batchId: batchId is int ? batchId : int.parse(batchId.toString()),
        batchName: batchName.toString(),
        dateStr: _formatDate(_selectedDate),
        onSaved: () {
          _loadAttendance();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final double hPadding = screenWidth >= 900 ? 36.0 : (screenWidth >= 650 ? 32.0 : 16.0);

    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Clean Green Header with full width for title and subtitle
            Padding(
              padding: EdgeInsets.only(
                left: hPadding,
                right: hPadding,
                top: 8.0,
                bottom: 14.0,
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back_ios, color: Colors.white, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Attendance Desk',
                          style: TextStyle(
                            fontFamily: 'Playfair Display',
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Institute-wide monitoring & WhatsApp alerts',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // White / Paper Content Container
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: Column(
                  children: [
                    // Sleek Date Navigation Bar
                    _buildDateNavBar(hPadding),

                    // Content Area: Loading, Error, or Data
                    Expanded(
                      child: _isLoading
                          ? const Center(
                              child: CircularProgressIndicator(color: Color(0xFF2E6656)),
                            )
                          : _error != null
                              ? Center(
                                  child: Padding(
                                    padding: const EdgeInsets.all(24.0),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.error_outline, color: Colors.red, size: 40),
                                        const SizedBox(height: 12),
                                        Text(
                                          _error!,
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(fontSize: 14, color: Colors.black87),
                                        ),
                                        const SizedBox(height: 16),
                                        ElevatedButton(
                                          onPressed: _loadAttendance,
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF1F2E27),
                                          ),
                                          child: const Text('Try Again', style: TextStyle(color: Colors.white)),
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                              : Column(
                                  children: [
                                    // Top Summary Card
                                    _buildTopSummaryCard(hPadding),

                              // Tab Bar
                              Container(
                                margin: EdgeInsets.symmetric(horizontal: hPadding),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade200),
                                ),
                                child: TabBar(
                                  controller: _tabController,
                                  labelColor: const Color(0xFF1F2E27),
                                  unselectedLabelColor: Colors.grey.shade600,
                                  indicatorColor: const Color(0xFF1F2E27),
                                  indicatorSize: TabBarIndicatorSize.tab,
                                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 12),
                                  tabs: [
                                    Tab(text: 'Batches (${_batchSummaries.length})'),
                                    Tab(
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Text('Absentees'),
                                          if (_absentees.isNotEmpty) ...[
                                            const SizedBox(width: 4),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.red.shade50,
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                '${_absentees.length}',
                                                style: TextStyle(
                                                  color: Colors.red.shade700,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    Tab(
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Text('Defaulters'),
                                          if (_defaulters.isNotEmpty) ...[
                                            const SizedBox(width: 4),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.orange.shade50,
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                '${_defaulters.length}',
                                                style: TextStyle(
                                                  color: Colors.orange.shade800,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 10),

                              // Tab Views
                              Expanded(
                                child: TabBarView(
                                  controller: _tabController,
                                  children: [
                                    _buildBatchesTab(hPadding),
                                    _buildAbsenteesTab(hPadding),
                                    _buildDefaultersTab(hPadding),
                                  ],
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
      ),
    );
  }

  
  Widget _buildDateNavBar(double hPadding) {
    final isToday = _isToday(_selectedDate);
    final isFuture = _isFutureDate(_selectedDate);

    return Container(
      margin: EdgeInsets.fromLTRB(hPadding, 12, hPadding, 4),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          // Previous Day Button
          InkWell(
            onTap: () {
              setState(() {
                _selectedDate = _selectedDate.subtract(const Duration(days: 1));
              });
              _loadAttendance();
            },
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F6F3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.chevron_left, size: 20, color: Color(0xFF1F2E27)),
            ),
          ),

          const SizedBox(width: 8),

          // Center Date Pill (clickable for DatePicker)
          Expanded(
            child: InkWell(
              onTap: _selectDate,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF2E6656)),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        _formatDateDisplay(_selectedDate),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1F2E27),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_drop_down, size: 18, color: Colors.grey),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Jump to Today button if not today
          if (!isToday) ...[
            InkWell(
              onTap: () {
                setState(() {
                  _selectedDate = DateTime.now();
                });
                _loadAttendance();
              },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFF2E6656).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'Today',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2E6656),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
          ],

          // Next Day Button
          InkWell(
            onTap: isFuture
                ? null
                : () {
                    setState(() {
                      _selectedDate = _selectedDate.add(const Duration(days: 1));
                    });
                    _loadAttendance();
                  },
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F6F3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.chevron_right,
                size: 20,
                color: isFuture ? Colors.grey.shade400 : const Color(0xFF1F2E27),
              ),
            ),
          ),

          const SizedBox(width: 4),

          // Refresh Button
          InkWell(
            onTap: _isLoading ? null : _loadAttendance,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F6F3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.refresh, size: 18, color: Color(0xFF2E6656)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopSummaryCard(double hPadding) {
    final rate = _overallSummary?['overallAttendanceRate'] ?? 0;
    final present = _overallSummary?['present'] ?? 0;
    final total = _overallSummary?['totalStudents'] ?? 0;
    final absent = _overallSummary?['absent'] ?? 0;
    final markedBatches = _overallSummary?['batchesMarkedCount'] ?? 0;
    final totalBatches = _overallSummary?['batchesTotalCount'] ?? 0;

    return Card(
      color: Colors.white,
      margin: EdgeInsets.fromLTRB(hPadding, 16, hPadding, 12),
      elevation: 0.5,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem('Turnout', '$rate%', const Color(0xFF2E6656)),
            _buildDivider(),
            _buildStatItem('Present', '$present/$total', Colors.black87),
            _buildDivider(),
            _buildStatItem('Absent', '$absent', const Color(0xFFA93327)),
            _buildDivider(),
            _buildStatItem('Batches', '$markedBatches/$totalBatches', const Color(0xFFA87D26)),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 32,
      color: Colors.grey.shade200,
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildBatchesTab(double hPadding) {
    if (_batchSummaries.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAttendance,
        child: ListView(
          padding: EdgeInsets.all(hPadding),
          children: const [
            SizedBox(height: 60),
            Center(
              child: Text(
                'No active batches found for this date',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAttendance,
      child: ListView.builder(
        padding: EdgeInsets.symmetric(horizontal: hPadding, vertical: 8),
        itemCount: _batchSummaries.length,
        itemBuilder: (context, idx) {
          final b = _batchSummaries[idx] as Map<String, dynamic>;
          final isMarked = b['isMarked'] == true;
          final batchName = b['batchName'] ?? 'Batch';
          final grade = b['grade'] ?? '';
          final total = b['totalStudents'] ?? 0;
          final present = b['presentCount'] ?? 0;
          final absent = b['absentCount'] ?? 0;
          final lateCount = b['lateCount'] ?? 0;
          final rate = b['attendanceRate'] ?? 0;
          final teacher = b['markedByTeacher'];

          return Card(
            color: Colors.white,
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _showBatchRegisterSheet(b),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                batchName.toString(),
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1F2E27),
                                ),
                              ),
                              if (grade.toString().isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  '$grade • $total enrolled',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isMarked ? const Color(0xFFE8F5E9) : const Color(0xFFFFF8E1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isMarked ? Colors.green.shade200 : Colors.orange.shade200,
                            ),
                          ),
                          child: Text(
                            isMarked ? 'Punched' : 'Pending',
                            style: TextStyle(
                              color: isMarked ? const Color(0xFF2E6656) : const Color(0xFFA87D26),
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF4F6F3),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isMarked
                            ? 'Marked by: ${teacher ?? "Teacher"}'
                            : 'Teacher punch pending for today',
                        style: TextStyle(
                          fontSize: 11,
                          color: isMarked ? const Color(0xFF2E6656) : Colors.orange.shade900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Text(
                          'Present: $present',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2E6656),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          'Absent: $absent',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFA93327),
                          ),
                        ),
                        if (lateCount > 0) ...[
                          const SizedBox(width: 16),
                          Text(
                            'Late: $lateCount',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFA87D26),
                            ),
                          ),
                        ],
                        const Spacer(),
                        Text(
                          '$rate% Turnout',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (rate is num ? rate : 0) / 100.0,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          rate >= 75
                              ? const Color(0xFF2E6656)
                              : rate >= 50
                                  ? const Color(0xFFA87D26)
                                  : const Color(0xFFA93327),
                        ),
                        minHeight: 4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildAbsenteesTab(double hPadding) {
    final filtered = _absentees.where((item) {
      final m = item as Map<String, dynamic>;
      final name = (m['fullName'] ?? '').toString().toLowerCase();
      final roll = (m['rollNo'] ?? '').toString().toLowerCase();
      final q = _searchQuery.toLowerCase();
      return name.contains(q) || roll.contains(q);
    }).toList();

    if (_absentees.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAttendance,
        child: ListView(
          padding: EdgeInsets.all(hPadding),
          children: const [
            SizedBox(height: 60),
            Center(
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.green, size: 48),
                  SizedBox(height: 12),
                  Text(
                    'No Absentees Today!',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'All students attended or attendance not yet marked.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Search Bar
        Padding(
          padding: EdgeInsets.symmetric(horizontal: hPadding, vertical: 8),
          child: TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Search absent student...',
              prefixIcon: const Icon(Icons.search, size: 20),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200),
              ),
            ),
          ),
        ),

        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadAttendance,
            child: ListView.builder(
              padding: EdgeInsets.symmetric(horizontal: hPadding, vertical: 4),
              itemCount: filtered.length,
              itemBuilder: (context, idx) {
                final a = filtered[idx] as Map<String, dynamic>;
                final name = a['fullName'] ?? 'Student';
                final roll = a['rollNo'] ?? '';
                final batch = a['batchName'] ?? '';
                final parentPhone = a['parentPhone'] ?? a['phone'] ?? 'No phone';
                final waUrl = a['waUrl'] ?? '';

                return Card(
                  color: Colors.white,
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 0.5,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: Colors.red.shade50,
                          child: Text(
                            name.toString().isNotEmpty ? name.toString()[0].toUpperCase() : 'A',
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name.toString(),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$batch ${roll.isNotEmpty ? "• Roll: $roll" : ""}',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                              ),
                              Text(
                                'Parent: $parentPhone',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: () => _launchWhatsApp(waUrl.toString()),
                          icon: const Icon(Icons.chat_bubble_outline, size: 14, color: Colors.white),
                          label: const Text(
                            'WhatsApp',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF25D366),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDefaultersTab(double hPadding) {
    if (_defaulters.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAttendance,
        child: ListView(
          padding: EdgeInsets.all(hPadding),
          children: const [
            SizedBox(height: 60),
            Center(
              child: Column(
                children: [
                  Icon(Icons.verified, color: Color(0xFF2E6656), size: 48),
                  SizedBox(height: 12),
                  Text(
                    'Zero Chronic Defaulters!',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'All enrolled students have attendance rate above 75%.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAttendance,
      child: ListView.builder(
        padding: EdgeInsets.symmetric(horizontal: hPadding, vertical: 8),
        itemCount: _defaulters.length,
        itemBuilder: (context, idx) {
          final d = _defaulters[idx] as Map<String, dynamic>;
          final name = d['fullName'] ?? 'Student';
          final roll = d['rollNo'] ?? '';
          final batch = d['batchName'] ?? '';
          final rate = d['attendanceRate'] ?? 0;
          final attended = d['attendedClasses'] ?? 0;
          final total = d['totalClasses'] ?? 0;
          final parentPhone = d['parentPhone'] ?? '';

          return Card(
            color: Colors.white,
            margin: const EdgeInsets.only(bottom: 10),
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name.toString(),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              '$batch ${roll.isNotEmpty ? "• Roll: $roll" : ""}',
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '$rate%',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: (rate is num && rate < 50) ? Colors.red : Colors.orange.shade800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        'Classes: $attended / $total',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                      ),
                      const Spacer(),
                      if (parentPhone.toString().isNotEmpty) ...[
                        InkWell(
                          onTap: () {
                            final clean = parentPhone.toString().replaceAll(RegExp(r'\D'), '');
                            final p = clean.length == 10 ? '91$clean' : clean;
                            _launchWhatsApp('https://wa.me/$p');
                          },
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat, size: 14, color: Color(0xFF25D366)),
                              SizedBox(width: 4),
                              Text(
                                'Alert Parent',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF25D366),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (rate is num ? rate : 0) / 100.0,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        (rate is num && rate < 50) ? Colors.red : Colors.orange,
                      ),
                      minHeight: 4,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Bottom Sheet for viewing and overriding student attendance in a batch
class _BatchRegisterBottomSheet extends ConsumerStatefulWidget {
  final int batchId;
  final String batchName;
  final String dateStr;
  final VoidCallback onSaved;

  const _BatchRegisterBottomSheet({
    required this.batchId,
    required this.batchName,
    required this.dateStr,
    required this.onSaved,
  });

  @override
  ConsumerState<_BatchRegisterBottomSheet> createState() => _BatchRegisterBottomSheetState();
}

class _BatchRegisterBottomSheetState extends ConsumerState<_BatchRegisterBottomSheet> {
  bool _loading = true;
  bool _saving = false;
  List<dynamic> _records = [];
  final Map<int, String> _statuses = {};

  @override
  void initState() {
    super.initState();
    _fetchBatchData();
  }

  Future<void> _fetchBatchData() async {
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.get('/admin/attendance?batchId=${widget.batchId}&date=${widget.dateStr}');
      final data = res as Map<String, dynamic>;
      final recs = (data['records'] as List<dynamic>?) ?? [];

      if (mounted) {
        setState(() {
          _records = recs;
          for (final r in recs) {
            final m = r as Map<String, dynamic>;
            final sId = m['studentId'] as int;
            final st = m['status'] as String?;
            if (st != null) _statuses[sId] = st;
          }
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveOverrides() async {
    setState(() => _saving = true);
    try {
      final api = ref.read(apiServiceProvider);
      final payload = {
        'batchId': widget.batchId,
        'date': widget.dateStr,
        'records': _statuses.entries.map((e) => {'studentId': e.key, 'status': e.value}).toList(),
      };
      await api.post('/admin/attendance', payload);
      widget.onSaved();
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attendance overrides saved successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyErrorMessage(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.batchName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Date: ${widget.dateStr}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: _saving ? null : _saveOverrides,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1F2E27),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Save Overrides', style: TextStyle(color: Colors.white, fontSize: 12)),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF1F2E27)))
                : _records.isEmpty
                    ? const Center(child: Text('No students enrolled in this batch'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _records.length,
                        separatorBuilder: (context, index) => const Divider(height: 1),
                        itemBuilder: (context, idx) {
                          final r = _records[idx] as Map<String, dynamic>;
                          final sId = r['studentId'] as int;
                          final name = r['fullName'] ?? 'Student';
                          final roll = r['rollNo'] ?? '';
                          final currentStatus = _statuses[sId] ?? '';

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name.toString(),
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                      ),
                                      if (roll.toString().isNotEmpty)
                                        Text(
                                          'Roll: $roll',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                        ),
                                    ],
                                  ),
                                ),
                                _buildStatusPill('P', 'present', currentStatus == 'present', const Color(0xFF2E6656), () {
                                  setState(() => _statuses[sId] = 'present');
                                }),
                                const SizedBox(width: 6),
                                _buildStatusPill('A', 'absent', currentStatus == 'absent', const Color(0xFFA93327), () {
                                  setState(() => _statuses[sId] = 'absent');
                                }),
                                const SizedBox(width: 6),
                                _buildStatusPill('L', 'late', currentStatus == 'late', const Color(0xFFA87D26), () {
                                  setState(() => _statuses[sId] = 'late');
                                }),
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

  Widget _buildStatusPill(String label, String value, bool isSelected, Color activeColor, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 32,
        height: 32,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? activeColor : Colors.grey.shade300,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey.shade700,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
