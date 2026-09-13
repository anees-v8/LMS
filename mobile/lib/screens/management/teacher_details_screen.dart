import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/assign_teacher_bottom_sheet.dart';

class TeacherDetailsScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> teacher;

  const TeacherDetailsScreen({super.key, required this.teacher});

  @override
  ConsumerState<TeacherDetailsScreen> createState() =>
      _TeacherDetailsScreenState();
}

class _TeacherDetailsScreenState extends ConsumerState<TeacherDetailsScreen> {
  late Map<String, dynamic> _teacher;

  @override
  void initState() {
    super.initState();
    _teacher = Map<String, dynamic>.from(widget.teacher);
  }

  void _showEditBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _EditTeacherBottomSheet(
        teacher: _teacher,
        onSaved: (updatedData) {
          setState(() {
            _teacher = updatedData;
          });
          ref.invalidate(teachersProvider);
        },
      ),
    );
  }

  void _showStatusBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ChangeStatusBottomSheet(
        teacher: _teacher,
        onSaved: (updatedData) {
          setState(() {
            _teacher = updatedData;
          });
          ref.invalidate(teachersProvider);
        },
      ),
    );
  }

  Future<void> _confirmRemove() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Remove Teacher',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Are you sure you want to permanently remove ${_teacher['fullName']}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      final api = ref.read(apiServiceProvider);
      await api.delete('/admin/teachers/${_teacher['id']}');
      ref.invalidate(teachersProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to remove teacher: ${friendlyErrorMessage(e)}',
            ),
          ),
        );
      }
    }
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    Color bg;
    IconData icon;
    switch (status) {
      case 'on_leave':
        color = Colors.orange.shade700;
        bg = Colors.orange.shade50;
        icon = Icons.beach_access;
        break;
      case 'inactive':
        color = Colors.grey.shade600;
        bg = Colors.grey.shade100;
        icon = Icons.person_off_outlined;
        break;
      default:
        color = Colors.green.shade700;
        bg = Colors.green.shade50;
        icon = Icons.check_circle_outline;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 6),
          Text(
            status == 'on_leave'
                ? 'On Leave'
                : status[0].toUpperCase() + status.substring(1),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final status = _teacher['status']?.toString() ?? 'active';
    final leaveStart = _teacher['leaveStart']?.toString();
    final leaveEnd = _teacher['leaveEnd']?.toString();

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2E27),
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Teacher Details',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: _showEditBottomSheet,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Profile Card — full width
            Card(
              color: Colors.white,
              elevation: 0,
              margin: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    CircleAvatar(
                      radius: 42,
                      backgroundColor: Colors.orange.shade50,
                      child: const Icon(
                        Icons.person,
                        color: Colors.orange,
                        size: 44,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _teacher['fullName'] ?? 'Unknown Teacher',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2E27),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildStatusBadge(status),
                    if (status == 'on_leave' && leaveStart != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Leave: $leaveStart → ${leaveEnd ?? '—'}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.orange.shade700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Contact Info
            _buildInfoCard(
              title: 'Contact Information',
              children: [
                _buildInfoRow(
                  Icons.phone_outlined,
                  'Phone Number',
                  _teacher['phone']?.toString() ?? 'N/A',
                ),
                const Divider(height: 24),
                _buildInfoRow(
                  Icons.email_outlined,
                  'Email Address',
                  _teacher['email']?.toString().isNotEmpty == true
                      ? _teacher['email']
                      : 'No email provided',
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Batch Assignments Card
            _buildAssignmentsCard(),
            const SizedBox(height: 16),

            // Status & Actions Card
            Card(
              color: Colors.white,
              elevation: 0,
              margin: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Status & Actions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2E27),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: _showStatusBottomSheet,
                        icon: const Icon(Icons.manage_accounts_outlined),
                        label: const Text('Change Status / Set Leave'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF1F2E27),
                          side: BorderSide(color: Colors.grey.shade300),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Remove Teacher button
            SizedBox(
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _confirmRemove,
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                label: const Text(
                  'Remove Teacher',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignmentsCard() {
    final teacherId = _teacher['id'] as int;
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Assigned Batches',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => showAssignTeacherBottomSheet(
                    context,
                    ref,
                    teacherUserId: teacherId,
                    teacherName: _teacher['fullName']?.toString() ?? 'Teacher',
                  ),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Assign'),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF2E6656),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Builder(
              builder: (context) {
                final assignmentsAsync = ref.watch(
                  teacherAssignmentsProvider((
                    teacherId: teacherId,
                    batchId: null,
                  )),
                );
                return assignmentsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (err, stack) => Text(
                    friendlyErrorMessage(err),
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                  data: (assignments) {
                    if (assignments.isEmpty) {
                      return Text(
                        'Not assigned to any batch yet.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 13,
                        ),
                      );
                    }
                    return Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: assignments.map<Widget>((a) {
                        final map = a as Map<String, dynamic>;
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFF2E6656,
                            ).withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '${map['batchName'] ?? 'Batch'} • ${map['subjectName'] ?? 'Subject'}',
                                style: const TextStyle(
                                  color: Color(0xFF2E6656),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(width: 6),
                              GestureDetector(
                                onTap: () => _confirmRemoveAssignment(
                                  map['id'] as int,
                                  teacherId,
                                ),
                                child: const Icon(
                                  Icons.close,
                                  size: 14,
                                  color: Color(0xFF2E6656),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmRemoveAssignment(int assignmentId, int teacherId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove assignment?'),
        content: const Text(
          'This teacher will no longer be assigned to this batch/subject.',
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
      await removeTeacherAssignment(ref.read(apiServiceProvider), assignmentId);
      ref.invalidate(
        teacherAssignmentsProvider((teacherId: teacherId, batchId: null)),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyErrorMessage(e)),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildInfoCard({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2E27),
              ),
            ),
            const SizedBox(height: 20),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.grey.shade600, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ────────────────── Change Status Bottom Sheet ──────────────────
class _ChangeStatusBottomSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic> teacher;
  final Function(Map<String, dynamic>) onSaved;

  const _ChangeStatusBottomSheet({
    required this.teacher,
    required this.onSaved,
  });

  @override
  ConsumerState<_ChangeStatusBottomSheet> createState() =>
      _ChangeStatusBottomSheetState();
}

class _ChangeStatusBottomSheetState
    extends ConsumerState<_ChangeStatusBottomSheet> {
  late String _status;
  DateTime? _leaveStart;
  DateTime? _leaveEnd;
  bool _saving = false;
  String? _error;

  final _dateFmt = DateFormat('yyyy-MM-dd');
  final _displayFmt = DateFormat('dd MMM yyyy');

  @override
  void initState() {
    super.initState();
    _status = widget.teacher['status']?.toString() ?? 'active';
    final ls = widget.teacher['leaveStart']?.toString();
    final le = widget.teacher['leaveEnd']?.toString();
    if (ls != null && ls.isNotEmpty) _leaveStart = DateTime.tryParse(ls);
    if (le != null && le.isNotEmpty) _leaveEnd = DateTime.tryParse(le);
  }

  Future<void> _pickDate(bool isStart) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: (isStart ? _leaveStart : _leaveEnd) ?? now,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _leaveStart = picked;
      } else {
        _leaveEnd = picked;
      }
    });
  }

  Future<void> _submit() async {
    if (_status == 'on_leave' && (_leaveStart == null || _leaveEnd == null)) {
      setState(() => _error = 'Please select both leave start and end dates.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final body = <String, dynamic>{'status': _status};
      if (_status == 'on_leave') {
        body['leaveStart'] = _dateFmt.format(_leaveStart!);
        body['leaveEnd'] = _dateFmt.format(_leaveEnd!);
      } else {
        body['leaveStart'] = null;
        body['leaveEnd'] = null;
      }
      final res = await api.put(
        '/admin/teachers/${widget.teacher['id']}',
        body,
      );
      final data = res as Map<String, dynamic>;
      final updatedData = Map<String, dynamic>.from(widget.teacher);
      updatedData['status'] = data['status'];
      updatedData['leaveStart'] = data['leaveStart'];
      updatedData['leaveEnd'] = data['leaveEnd'];
      widget.onSaved(updatedData);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  Widget _statusOption(String value, String label, IconData icon, Color color) {
    final selected = _status == value;
    return GestureDetector(
      onTap: () => setState(() => _status = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.08) : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? color : Colors.grey.shade200,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: selected ? color : Colors.grey.shade500,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: selected ? color : Colors.black87,
                ),
              ),
            ),
            if (selected) Icon(Icons.check_circle, color: color, size: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle — consistent with every other bottom sheet in the app.
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              height: 4,
              width: 40,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Change Status',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _statusOption(
                    'active',
                    'Active',
                    Icons.check_circle_outline,
                    Colors.green,
                  ),
                  _statusOption(
                    'on_leave',
                    'On Leave',
                    Icons.beach_access,
                    Colors.orange,
                  ),
                  _statusOption(
                    'inactive',
                    'Inactive',
                    Icons.person_off_outlined,
                    Colors.grey,
                  ),

                  // Leave date pickers — shown only when on_leave is selected
                  if (_status == 'on_leave') ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickDate(true),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Colors.orange.shade200,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.calendar_today_outlined,
                                    color: Colors.orange.shade700,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _leaveStart != null
                                          ? _displayFmt.format(_leaveStart!)
                                          : 'Start Date',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w500,
                                        color: _leaveStart != null
                                            ? Colors.black87
                                            : Colors.orange.shade400,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () => _pickDate(false),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Colors.orange.shade200,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.event_outlined,
                                    color: Colors.orange.shade700,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _leaveEnd != null
                                          ? _displayFmt.format(_leaveEnd!)
                                          : 'End Date',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w500,
                                        color: _leaveEnd != null
                                            ? Colors.black87
                                            : Colors.orange.shade400,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],

                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: Colors.red,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: Colors.red,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: _saving
                ? const Center(child: CircularProgressIndicator())
                : SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: CustomButton(
                      text: 'Save Status',
                      onPressed: _submit,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ────────────────── Edit Teacher Bottom Sheet ──────────────────
class _EditTeacherBottomSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic> teacher;
  final Function(Map<String, dynamic>) onSaved;

  const _EditTeacherBottomSheet({required this.teacher, required this.onSaved});

  @override
  ConsumerState<_EditTeacherBottomSheet> createState() =>
      _EditTeacherBottomSheetState();
}

class _EditTeacherBottomSheetState
    extends ConsumerState<_EditTeacherBottomSheet> {
  late TextEditingController _name;
  late TextEditingController _phone;
  late TextEditingController _email;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(
      text: widget.teacher['fullName']?.toString() ?? '',
    );
    _phone = TextEditingController(
      text: widget.teacher['phone']?.toString() ?? '',
    );
    _email = TextEditingController(
      text: widget.teacher['email']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Name is required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.put('/admin/teachers/${widget.teacher['id']}', {
        'fullName': _name.text.trim(),
        'phone': _phone.text.trim(),
        'email': _email.text.trim().isNotEmpty ? _email.text.trim() : null,
      });
      final data = res as Map<String, dynamic>;
      final updatedData = Map<String, dynamic>.from(widget.teacher);
      updatedData['fullName'] = data['fullName'];
      updatedData['phone'] = data['phone'];
      updatedData['email'] = data['email'];
      widget.onSaved(updatedData);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle — consistent with every other bottom sheet in the app.
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              height: 4,
              width: 40,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Edit Teacher',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CustomTextField(
                    label: 'Full Name',
                    hint: 'e.g. Sunita Patil',
                    controller: _name,
                    prefixIcon: Icons.person_outline,
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Phone Number',
                    hint: '10-digit mobile number',
                    controller: _phone,
                    prefixIcon: Icons.phone_outlined,
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Email Address (Optional)',
                    hint: 'e.g. teacher@school.com',
                    controller: _email,
                    prefixIcon: Icons.email_outlined,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: Colors.red,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: Colors.red,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: _saving
                ? const Center(child: CircularProgressIndicator())
                : SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: CustomButton(
                      text: 'Save Changes',
                      onPressed: _submit,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
