import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_dropdown.dart';

import 'teacher_details_screen.dart';

class TeachersScreen extends ConsumerWidget {
  const TeachersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teachersAsync = ref.watch(teachersProvider);

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
                    'Teachers',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage and view all your teachers',
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
                child: teachersAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (teachers) {
                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(teachersProvider),
                      child: Column(
                        children: [
                          // Stats Header
                          Card(
                            color: Colors.white,
                            margin: const EdgeInsets.all(16),
                            elevation: 1,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              child: Builder(
                                builder: (_) {
                                  final activeCount = teachers.where((t) {
                                    final m = t as Map<String, dynamic>;
                                    return m['status'] == 'active' ||
                                        m['status'] == null;
                                  }).length;
                                  final leaveCount = teachers
                                      .where(
                                        (t) =>
                                            (t
                                                as Map<
                                                  String,
                                                  dynamic
                                                >)['status'] ==
                                            'on_leave',
                                      )
                                      .length;
                                  final inactiveCount = teachers
                                      .where(
                                        (t) =>
                                            (t
                                                as Map<
                                                  String,
                                                  dynamic
                                                >)['status'] ==
                                            'inactive',
                                      )
                                      .length;
                                  return Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceEvenly,
                                    children: [
                                      _buildStatItem(
                                        'Total',
                                        '${teachers.length}',
                                        Icons.people_outline,
                                        const Color(0xFF2E6656),
                                      ),
                                      _buildDivider(),
                                      _buildStatItem(
                                        'Active',
                                        '$activeCount',
                                        Icons.how_to_reg_outlined,
                                        Colors.blue,
                                      ),
                                      _buildDivider(),
                                      _buildStatItem(
                                        'On Leave',
                                        '$leaveCount',
                                        Icons.beach_access,
                                        Colors.orange,
                                      ),
                                      _buildDivider(),
                                      _buildStatItem(
                                        'Inactive',
                                        '$inactiveCount',
                                        Icons.person_off_outlined,
                                        Colors.grey,
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ),
                          ),

                          // Search Row
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.search,
                                    color: Colors.grey.shade500,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: TextField(
                                      decoration: InputDecoration(
                                        hintText:
                                            'Search by name or phone number...',
                                        border: InputBorder.none,
                                        hintStyle: TextStyle(fontSize: 13),
                                        isDense: true,
                                        contentPadding: EdgeInsets.symmetric(
                                          vertical: 12,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Teacher List
                          Expanded(
                            child: teachers.isEmpty
                                ? const Center(
                                    child: Text('No teachers found.'),
                                  )
                                : ListView.separated(
                                    padding: const EdgeInsets.fromLTRB(
                                      16,
                                      16,
                                      16,
                                      160,
                                    ),
                                    itemCount: teachers.length,
                                    separatorBuilder: (_, __) =>
                                        const SizedBox(height: 12),
                                    itemBuilder: (context, index) {
                                      final teacher =
                                          teachers[index]
                                              as Map<String, dynamic>;
                                      return _buildTeacherCard(
                                        context,
                                        ref,
                                        teacher,
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddTeacherSheet(context, ref),
        backgroundColor: const Color(0xFF1F2E27),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          'Add Teacher',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: const Color(0xFF1F2E27),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Colors.grey,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(height: 40, width: 1, color: Colors.grey.shade200);
  }

  Widget _buildTeacherCard(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> teacher,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => TeacherDetailsScreen(teacher: teacher),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Card(
          margin: EdgeInsets.zero,
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.orange.shade50,
                  child: const Icon(
                    Icons.person_outline,
                    color: Colors.orange,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        teacher['fullName'] ?? 'Unknown',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: Color(0xFF1F2E27),
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Teacher',
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.phone_outlined,
                            size: 14,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            teacher['phone']?.toString() ?? '',
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Builder(
                        builder: (_) {
                          final status =
                              teacher['status']?.toString() ?? 'active';
                          Color color;
                          Color bg;
                          String label;
                          if (status == 'on_leave') {
                            color = Colors.orange.shade700;
                            bg = Colors.orange.shade50;
                            label = 'On Leave';
                          } else if (status == 'inactive') {
                            color = Colors.grey.shade600;
                            bg = Colors.grey.shade100;
                            label = 'Inactive';
                          } else {
                            color = Colors.green.shade700;
                            bg = Colors.green.shade50;
                            label = 'Active';
                          }
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: bg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  label,
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, color: Colors.grey),
                      padding: EdgeInsets.zero,
                      onSelected: (val) {
                        if (val == 'delete')
                          _confirmDelete(context, ref, teacher);
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'delete',
                          child: Text(
                            'Remove Teacher',
                            style: TextStyle(color: Colors.red),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Icon(Icons.chevron_right, color: Colors.black87),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> teacher,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove teacher?'),
        content: Text(
          '${teacher['fullName'] ?? 'This teacher'} will be removed permanently.',
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
      await deleteTeacher(ref.read(apiServiceProvider), teacher['id'] as int);
      ref.invalidate(teachersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Teacher removed')));
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

/// Loads the tenant's batches before opening the Add Teacher sheet, so the
/// sheet can offer batch+subject assignment in the same step as creation
/// (rather than requiring a separate trip to Teacher Details afterwards).
/// A teacher can still be created with zero batches assigned — the batch
/// field is optional — and more assignments can always be added later from
/// Teacher Details.
Future<void> _openAddTeacherSheet(BuildContext context, WidgetRef ref) async {
  final batches = await ref.read(batchesProvider.future);
  if (!context.mounted) return;
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) =>
        _AddTeacherBottomSheet(batches: batches.cast<Map<String, dynamic>>()),
  );
}

class _AddTeacherBottomSheet extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> batches;

  const _AddTeacherBottomSheet({required this.batches});

  @override
  ConsumerState<_AddTeacherBottomSheet> createState() =>
      _AddTeacherBottomSheetState();
}

class _AddTeacherBottomSheetState
    extends ConsumerState<_AddTeacherBottomSheet> {
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _email = TextEditingController();
  int? _batchId;
  int? _subjectId;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _password.dispose();
    _email.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _batchSubjects {
    if (_batchId == null) return const [];
    final batch = widget.batches.firstWhere(
      (b) => b['id'] == _batchId,
      orElse: () => const {},
    );
    final subjectIds =
        (batch['subjectIds'] as List<dynamic>?)?.cast<int>() ?? const [];
    final subjectNames =
        (batch['subjectNames'] as List<dynamic>?)?.cast<dynamic>() ?? const [];
    return [
      for (var i = 0; i < subjectIds.length; i++)
        {
          'id': subjectIds[i],
          'name': i < subjectNames.length ? subjectNames[i] : 'Subject',
        },
    ];
  }

  Future<void> _submit() async {
    if (_fullName.text.trim().isEmpty ||
        _phone.text.trim().isEmpty ||
        _password.text.isEmpty) {
      setState(() => _error = 'Full name, phone and password are required.');
      return;
    }
    if (_batchId != null && _subjectId == null) {
      setState(() => _error = 'Select a subject for the chosen batch.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final api = ref.read(apiServiceProvider);
    try {
      final teacher = await createTeacher(
        api,
        fullName: _fullName.text.trim(),
        phone: _phone.text.trim(),
        password: _password.text,
        email: _email.text.trim(),
      );
      ref.invalidate(teachersProvider);

      if (_batchId != null && _subjectId != null) {
        try {
          await assignTeacherToBatch(
            api,
            teacherUserId: teacher['id'] as int,
            batchId: _batchId!,
            subjectId: _subjectId!,
          );
        } catch (e) {
          // The teacher account was already created successfully — a failed
          // assignment (e.g. a schedule clash) shouldn't look like the whole
          // action failed. Report it separately so the admin knows to assign
          // manually from Teacher Details instead of retrying creation.
          if (mounted) {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Teacher created, but batch assignment failed: ${friendlyErrorMessage(e)}. Assign it from Teacher Details instead.',
                ),
                backgroundColor: Colors.orange,
              ),
            );
          }
          return;
        }
      }

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
                  'Add New Teacher',
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
                    hint: 'e.g. Rahul Sharma',
                    controller: _fullName,
                    prefixIcon: Icons.person_outline,
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Phone Number',
                    hint: '10 digit mobile number',
                    controller: _phone,
                    prefixIcon: Icons.phone_outlined,
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Password',
                    hint: 'Min 6 characters',
                    isPassword: true,
                    controller: _password,
                    prefixIcon: Icons.lock_outline,
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Email Address (Optional)',
                    hint: 'teacher@example.com',
                    controller: _email,
                    prefixIcon: Icons.email_outlined,
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Assign to Batch (Optional)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Pick a batch and subject now, or assign one later from Teacher Details.',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  const SizedBox(height: 10),
                  CustomDropdown<int>(
                    label: 'Batch',
                    hint: 'Select a batch',
                    prefixIcon: Icons.group_outlined,
                    value: _batchId,
                    options: widget.batches
                        .map(
                          (b) => DropdownOption<int>(
                            value: b['id'] as int,
                            label: b['name']?.toString() ?? '',
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() {
                      _batchId = v;
                      _subjectId = null;
                    }),
                  ),
                  const SizedBox(height: 16),
                  CustomDropdown<int>(
                    label: 'Subject',
                    hint: _batchId == null
                        ? 'Select a batch first'
                        : 'Select a subject',
                    prefixIcon: Icons.menu_book,
                    value: _subjectId,
                    enabled: _batchId != null,
                    options: _batchSubjects
                        .map(
                          (s) => DropdownOption<int>(
                            value: s['id'] as int,
                            label: s['name']?.toString() ?? '',
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _subjectId = v),
                  ),
                  if (_batchId != null && _batchSubjects.isEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'This batch has no subjects yet.',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
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
                      text: 'Add Teacher',
                      onPressed: _submit,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
