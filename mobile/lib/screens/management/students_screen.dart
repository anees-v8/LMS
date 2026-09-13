import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/management_overview_tile.dart';
import '../../widgets/import_students_bottom_sheet.dart';
import '../../widgets/custom_dropdown.dart';
import 'student_details_screen.dart';

class StudentsScreen extends ConsumerStatefulWidget {
  const StudentsScreen({super.key});

  @override
  ConsumerState<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends ConsumerState<StudentsScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedBatchName = 'All Students';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(studentsProvider);
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
                right: 12.0,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Students',
                          style: TextStyle(
                            fontFamily: 'Playfair Display',
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Manage and track all students',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Import Students',
                    icon: const Icon(
                      Icons.file_upload_outlined,
                      color: Colors.white,
                    ),
                    onPressed: () => showImportStudentsSheet(
                      context,
                      () => ref.invalidate(studentsProvider),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search Bar
                    Padding(
                      padding: const EdgeInsets.only(
                        top: 20.0,
                        left: 16.0,
                        right: 16.0,
                        bottom: 16.0,
                      ),
                      child: SizedBox(
                        height: 48,
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search by name, roll no, class...',
                            prefixIcon: const Icon(
                              Icons.search,
                              color: Colors.grey,
                            ),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(
                                      Icons.clear,
                                      color: Colors.grey,
                                    ),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 0,
                              horizontal: 16,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          onChanged: (val) {
                            setState(() {
                              _searchQuery = val;
                            });
                          },
                        ),
                      ),
                    ),

                    // Class filters
                    batchesAsync.when(
                      loading: () => const SizedBox.shrink(),
                      error: (err, stack) => const SizedBox.shrink(),
                      data: (batches) {
                        final allStudentsCount =
                            studentsAsync.value?.length ?? 0;
                        return SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: Row(
                            children: [
                              _buildFilterChip(
                                'All Students',
                                allStudentsCount.toString(),
                                _selectedBatchName == 'All Students',
                                onTap: () {
                                  setState(
                                    () => _selectedBatchName = 'All Students',
                                  );
                                },
                              ),
                              const SizedBox(width: 8),
                              ...batches.map((batch) {
                                final batchName =
                                    batch['name']?.toString() ?? 'Unnamed';
                                final batchStudentCount =
                                    studentsAsync.value
                                        ?.where(
                                          (s) => s['batchName'] == batchName,
                                        )
                                        .length ??
                                    0;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8.0),
                                  child: _buildFilterChip(
                                    batchName,
                                    batchStudentCount.toString(),
                                    _selectedBatchName == batchName,
                                    onTap: () {
                                      setState(
                                        () => _selectedBatchName = batchName,
                                      );
                                    },
                                  ),
                                );
                              }),
                            ],
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),

                    // Management Overview
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: studentsAsync.when(
                        loading: () => const SizedBox.shrink(),
                        error: (err, stack) => const SizedBox.shrink(),
                        data: (students) {
                          final totalStudents = students.length;
                          final totalPendingFees = students.fold<num>(
                            0,
                            (sum, item) =>
                                sum + ((item['pendingFees'] as num?) ?? 0),
                          );

                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: _buildStatItem(
                                    'Total Students',
                                    totalStudents.toString(),
                                    Icons.people_outline,
                                    const Color(0xFF2E6656),
                                  ),
                                ),
                                Container(
                                  width: 1,
                                  height: 40,
                                  color: Colors.grey.shade200,
                                ),
                                Expanded(
                                  child: _buildStatItem(
                                    'Present Today',
                                    '0',
                                    Icons.how_to_reg,
                                    const Color(0xFF2E6656),
                                  ),
                                ),
                                Container(
                                  width: 1,
                                  height: 40,
                                  color: Colors.grey.shade200,
                                ),
                                Expanded(
                                  child: _buildStatItem(
                                    'Pending Fees',
                                    '₹$totalPendingFees',
                                    Icons.account_balance_wallet_outlined,
                                    Colors.red,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Scrollable Student List
                    Expanded(
                      child: studentsAsync.when(
                        loading: () => const Center(
                          child: Padding(
                            padding: EdgeInsets.all(20.0),
                            child: CircularProgressIndicator(),
                          ),
                        ),
                        error: (err, stack) => Center(
                          child: Padding(
                            padding: EdgeInsets.all(20.0),
                            child: Text(friendlyErrorMessage(err)),
                          ),
                        ),
                        data: (students) {
                          final filteredStudents = students.where((student) {
                            final batchMatch =
                                _selectedBatchName == 'All Students' ||
                                student['batchName'] == _selectedBatchName;
                            if (!batchMatch) return false;

                            final name = (student['fullName'] ?? '')
                                .toString()
                                .toLowerCase();
                            final rollNo = (student['rollNo'] ?? '')
                                .toString()
                                .toLowerCase();
                            final q = _searchQuery.toLowerCase();
                            return name.contains(q) || rollNo.contains(q);
                          }).toList();

                          if (students.isEmpty) {
                            return const Center(
                              child: Padding(
                                padding: EdgeInsets.all(40.0),
                                child: Text('No students found.'),
                              ),
                            );
                          } else if (filteredStudents.isEmpty) {
                            return Center(
                              child: Padding(
                                padding: EdgeInsets.all(40.0),
                                child: Text('No results for "$_searchQuery"'),
                              ),
                            );
                          }

                          return ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 160),
                            itemCount: filteredStudents.length,
                            itemBuilder: (context, index) {
                              final student =
                                  filteredStudents[index]
                                      as Map<String, dynamic>;
                              final rollNo = student['rollNo'] ?? 'N/A';
                              final grade = student['grade'] ?? 'N/A';
                              final batchName =
                                  student['batchName']?.toString() ?? 'N/A';
                              final phone =
                                  student['phone']?.toString() ?? 'N/A';
                              final pendingFees = student['pendingFees'] ?? 0;
                              final attendance = student['attendance'] ?? 0;

                              return InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => StudentDetailsScreen(
                                        student: student,
                                      ),
                                    ),
                                  );
                                },
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.03,
                                        ),
                                        blurRadius: 10,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Top Row
                                      Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 24,
                                            backgroundColor: const Color(
                                              0xFF1F2E27,
                                            ).withValues(alpha: 0.08),
                                            child: const Icon(
                                              Icons.person,
                                              color: Color(0xFF1F2E27),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  student['fullName'] ??
                                                      'Unknown',
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 18,
                                                    color: Color(0xFF1F2E27),
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  'Roll No: $rollNo • Class $grade',
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    color: Colors.grey.shade600,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 16),

                                      // Tags Row
                                      Row(
                                        children: [
                                          _buildTag(
                                            Icons.calendar_today,
                                            'Batch',
                                            batchName,
                                          ),
                                          const SizedBox(width: 12),
                                          _buildTag(
                                            Icons.phone,
                                            'Phone',
                                            phone,
                                          ),
                                        ],
                                      ),

                                      const SizedBox(height: 16),
                                      const Divider(
                                        height: 1,
                                        color: Color(0xFFF0F0F0),
                                      ),
                                      const SizedBox(height: 16),

                                      // Bottom Row
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          // Fees Pending
                                          Row(
                                            children: [
                                              Text(
                                                'Fees Pending ',
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  color: Colors.grey.shade600,
                                                ),
                                              ),
                                              Text(
                                                '₹$pendingFees',
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  color: Colors.red,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),

                                          // Attendance & Arrow
                                          Row(
                                            children: [
                                              Text(
                                                'Attendance ',
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  color: Colors.grey.shade600,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Stack(
                                                alignment: Alignment.center,
                                                children: [
                                                  SizedBox(
                                                    width: 36,
                                                    height: 36,
                                                    child:
                                                        CircularProgressIndicator(
                                                          value:
                                                              attendance / 100,
                                                          backgroundColor:
                                                              Colors
                                                                  .grey
                                                                  .shade200,
                                                          color: const Color(
                                                            0xFF2E6656,
                                                          ),
                                                          strokeWidth: 4,
                                                        ),
                                                  ),
                                                  Text(
                                                    '$attendance%',
                                                    style: const TextStyle(
                                                      fontSize: 10,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(width: 16),
                                              const Icon(
                                                Icons.chevron_right,
                                                color: Colors.grey,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 80), // bottom padding for FAB
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        backgroundColor: const Color(0xFF1F2E27),
        foregroundColor: Colors.white,
        onPressed: () => showAddStudentDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add Student'),
      ),
    );
  }

  Widget _buildFilterChip(
    String label,
    String count,
    bool isSelected, {
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1F2E27) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: isSelected ? null : Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : const Color(0xFF1F2E27),
              ),
            ),
            Text(
              '($count)',
              style: TextStyle(
                fontSize: 11,
                color: isSelected ? Colors.white70 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F6F3),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade700),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1F2E27),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          title,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> student,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove student?'),
        content: Text(
          '${student['fullName'] ?? 'This student'} will be removed permanently.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await deleteStudent(ref.read(apiServiceProvider), student['id'] as int);
      ref.invalidate(studentsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Student removed')));
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
  }
}

Future<void> showAddStudentDialog(
  BuildContext context,
  WidgetRef ref, {
  Map<String, dynamic>? student,
}) async {
  final batches = await ref.read(batchesProvider.future);
  if (!context.mounted) return;
  if (batches.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Create a batch first — a student must be enrolled in one.',
        ),
      ),
    );
    return;
  }
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => AddStudentDialog(
      batches: batches.cast<Map<String, dynamic>>(),
      student: student,
    ),
  );
}

class AddStudentDialog extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> batches;
  final Map<String, dynamic>? student;
  const AddStudentDialog({required this.batches, this.student});

  @override
  ConsumerState<AddStudentDialog> createState() => _AddStudentDialogState();
}

class _AddStudentDialogState extends ConsumerState<AddStudentDialog> {
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _parentName = TextEditingController();
  final _parentPhone = TextEditingController();
  final _grade = TextEditingController();
  final _rollNo = TextEditingController();
  final _feeOverride = TextEditingController();
  int? _batchId;
  bool _saving = false;
  String? _error;
  bool _obscurePassword = true;
  bool _autoGenerateRoll = true;

  @override
  void initState() {
    super.initState();
    if (widget.student != null) {
      _fullName.text = widget.student!['fullName']?.toString() ?? '';
      _phone.text = widget.student!['phone']?.toString() ?? '';
      _parentName.text = widget.student!['parentName']?.toString() ?? '';
      _parentPhone.text = widget.student!['parentPhone']?.toString() ?? '';
      _grade.text = widget.student!['grade']?.toString() ?? '';
      _rollNo.text = widget.student!['rollNo']?.toString() ?? '';
      _feeOverride.text =
          widget.student!['feeOverrideAmount']?.toString() ?? '';
      _batchId = widget.student!['batchId'] as int?;
      _autoGenerateRoll = _rollNo.text.isEmpty;
    } else {
      _batchId = widget.batches.first['id'] as int?;
    }
  }

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _password.dispose();
    _parentName.dispose();
    _parentPhone.dispose();
    _grade.dispose();
    _rollNo.dispose();
    _feeOverride.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_fullName.text.trim().isEmpty ||
        _phone.text.trim().isEmpty ||
        (widget.student == null && _password.text.isEmpty) ||
        _parentPhone.text.trim().isEmpty ||
        _batchId == null) {
      setState(
        () => _error = 'Please fill all required fields (marked with *).',
      );
      return;
    }
    final feeOverrideText = _feeOverride.text.trim();
    int? feeOverrideAmount;
    if (feeOverrideText.isNotEmpty) {
      feeOverrideAmount = int.tryParse(feeOverrideText);
      if (feeOverrideAmount == null || feeOverrideAmount < 0) {
        setState(() => _error = 'Enter a valid custom fee amount.');
        return;
      }
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.student != null) {
        await updateStudent(
          ref.read(apiServiceProvider),
          widget.student!['id'] as int,
          fullName: _fullName.text.trim(),
          phone: _phone.text.trim(),
          password: _password.text.isEmpty ? null : _password.text,
          parentPhone: _parentPhone.text.trim(),
          batchId: _batchId!,
          parentName: _parentName.text.trim(),
          grade: _grade.text.trim(),
          rollNo: _autoGenerateRoll ? '' : _rollNo.text.trim(),
          feeOverrideAmount: feeOverrideAmount,
        );
      } else {
        await createStudent(
          ref.read(apiServiceProvider),
          fullName: _fullName.text.trim(),
          phone: _phone.text.trim(),
          password: _password.text,
          parentPhone: _parentPhone.text.trim(),
          batchId: _batchId!,
          parentName: _parentName.text.trim().isEmpty
              ? null
              : _parentName.text.trim(),
          grade: _grade.text.trim().isEmpty ? null : _grade.text.trim(),
          rollNo: _autoGenerateRoll
              ? null
              : (_rollNo.text.trim().isEmpty ? null : _rollNo.text.trim()),
          feeOverrideAmount: feeOverrideAmount,
        );
      }
      ref.invalidate(studentsProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  Widget _buildSectionHeader(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0, top: 8.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF4F6F3),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: const Color(0xFF1F2E27), size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Color(0xFF1F2E27),
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData prefixIcon,
    bool isRequired = false,
    bool isPassword = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword && _obscurePassword,
        keyboardType: prefixIcon == Icons.currency_rupee
            ? TextInputType.number
            : TextInputType.text,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
          prefixIcon: Icon(prefixIcon, color: Colors.grey.shade600, size: 20),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isRequired)
                const Text(
                  '*',
                  style: TextStyle(color: Colors.red, fontSize: 16),
                ),
              if (isPassword)
                IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: Colors.grey.shade600,
                    size: 20,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              if (!isPassword) const SizedBox(width: 16),
            ],
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        top: 40,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF8F9FA), // Light background like screenshot
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag Handle
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                height: 4,
                width: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Container(
              padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        backgroundColor: const Color(0xFFF4F6F3),
                        radius: 24,
                        child: const Icon(
                          Icons.person,
                          color: Color(0xFF1F2E27),
                          size: 28,
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(
                            color: Color(0xFFA87D26),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Colors.white,
                            size: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.student != null
                              ? 'Edit Student'
                              : 'Add New Student',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2E27),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.student != null
                              ? 'Update the details of the student'
                              : 'Fill in the details to add a new student',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 18,
                        color: Colors.black87,
                      ),
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Section 1
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _buildSectionHeader(
                            Icons.person_outline,
                            'Personal Information',
                            'Basic details of the student',
                          ),
                          _buildInputField(
                            controller: _fullName,
                            hint: 'Student Full Name',
                            prefixIcon: Icons.person_outline,
                            isRequired: true,
                          ),
                          _buildInputField(
                            controller: _phone,
                            hint: 'Phone Number (10-15 digits)',
                            prefixIcon: Icons.phone_outlined,
                            isRequired: true,
                          ),
                          _buildInputField(
                            controller: _password,
                            hint: 'Password (min. 6 characters)',
                            prefixIcon: Icons.lock_outline,
                            isRequired: true,
                            isPassword: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 2
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _buildSectionHeader(
                            Icons.school_outlined,
                            'Academic Information',
                            'Class and enrollment details',
                          ),
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.school_outlined,
                                            size: 16,
                                            color: Colors.grey.shade600,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Class',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade600,
                                            ),
                                          ),
                                        ],
                                      ),
                                      TextField(
                                        controller: _grade,
                                        decoration: const InputDecoration(
                                          hintText: 'Select Class',
                                          isDense: true,
                                          contentPadding: EdgeInsets.only(
                                            top: 4,
                                            bottom: 4,
                                          ),
                                          border: InputBorder.none,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: CustomDropdown<int?>(
                                  label: 'Batch *',
                                  hint: 'Select Batch',
                                  value: _batchId,
                                  prefixIcon: Icons.people_outline,
                                  options: widget.batches
                                      .map(
                                        (b) => DropdownOption<int?>(
                                          value: b['id'] as int,
                                          label: b['name']?.toString() ?? '',
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) =>
                                      setState(() => _batchId = v),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (!_autoGenerateRoll)
                            _buildInputField(
                              controller: _rollNo,
                              hint: 'Enter roll number',
                              prefixIcon: Icons.tag,
                            ),
                          Row(
                            children: [
                              Checkbox(
                                value: _autoGenerateRoll,
                                activeColor: const Color(0xFF1F2E27),
                                onChanged: (v) {
                                  setState(() {
                                    _autoGenerateRoll = v ?? true;
                                    if (_autoGenerateRoll) _rollNo.clear();
                                  });
                                },
                              ),
                              const Text(
                                'Auto generate roll number',
                                style: TextStyle(fontSize: 14),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 3
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _buildSectionHeader(
                            Icons.family_restroom,
                            'Parent / Guardian Information',
                            'For communication and notifications',
                          ),
                          _buildInputField(
                            controller: _parentName,
                            hint: 'Parent / Guardian Name (optional)',
                            prefixIcon: Icons.person_outline,
                          ),
                          _buildInputField(
                            controller: _parentPhone,
                            hint: 'Parent WhatsApp Number *',
                            prefixIcon: Icons.phone_outlined,
                            isRequired: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section 4
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _buildSectionHeader(
                            Icons.currency_rupee,
                            'Fees',
                            'Override the batch\'s default fee for this student',
                          ),
                          _buildInputField(
                            controller: _feeOverride,
                            hint: 'Custom Fee (Optional)',
                            prefixIcon: Icons.currency_rupee,
                          ),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: EdgeInsets.only(top: 4, bottom: 4),
                              child: Text(
                                'Leave blank to use the batch\'s default fee.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Footer Buttons
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(
                  bottom: Radius.circular(24),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: FilledButton(
                      onPressed: _saving ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFA87D26),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              widget.student != null
                                  ? 'Update Student'
                                  : 'Add Student',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
