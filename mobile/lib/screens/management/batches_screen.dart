import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/batch_schedule_bottom_sheet.dart';

import 'batch_students_screen.dart';

class BatchesScreen extends ConsumerWidget {
  const BatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
                    'Batches',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage your classroom batches and grades',
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
                child: batchesAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (batches) {
                    int totalStudents = 0;
                    for (var b in batches) {
                      totalStudents += (b['studentCount'] as int? ?? 0);
                    }
                    final avgSize = batches.isEmpty
                        ? 0
                        : (totalStudents / batches.length).round();

                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(batchesProvider),
                      child: CustomScrollView(
                        slivers: [
                          if (batches.isNotEmpty) ...[
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  16,
                                  16,
                                  8,
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: _buildStatCard(
                                        'Total Batches',
                                        '${batches.length}',
                                        Icons.class_outlined,
                                        const Color(0xFF2E6656),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _buildStatCard(
                                        'Enrolled Students',
                                        '$totalStudents',
                                        Icons.people_outline,
                                        Colors.blue.shade700,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _buildStatCard(
                                        'Avg. Batch Size',
                                        '$avgSize',
                                        Icons.pie_chart_outline,
                                        Colors.orange.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                          if (batches.isEmpty)
                            SliverFillRemaining(
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.class_outlined,
                                      size: 64,
                                      color: Color(0xFF2E6656),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'No batches yet',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF1F2E27),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      'Tap "Create Batch" to add your first batch.',
                                      style: TextStyle(
                                        color: Color(0xFF2E6656),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          else
                            SliverPadding(
                              padding: const EdgeInsets.fromLTRB(
                                16,
                                16,
                                16,
                                160,
                              ),
                              sliver: SliverList(
                                delegate: SliverChildBuilderDelegate((
                                  context,
                                  index,
                                ) {
                                  final batch =
                                      batches[index] as Map<String, dynamic>;
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: InkWell(
                                      onTap: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => BatchStudentsScreen(
                                              batchId: batch['id'] as int,
                                              batchName:
                                                  batch['name']?.toString() ??
                                                  'Batch',
                                            ),
                                          ),
                                        );
                                      },
                                      borderRadius: BorderRadius.circular(16),
                                      child: Container(
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.black.withValues(
                                                alpha: 0.03,
                                              ),
                                              blurRadius: 8,
                                              offset: const Offset(0, 4),
                                            ),
                                          ],
                                          border: Border.all(
                                            color: Colors.grey.shade200,
                                          ),
                                        ),
                                        child: Padding(
                                          padding: const EdgeInsets.all(16.0),
                                          child: Row(
                                            children: [
                                              Container(
                                                width: 48,
                                                height: 48,
                                                decoration: BoxDecoration(
                                                  color: const Color(
                                                    0xFF2E6656,
                                                  ).withValues(alpha: 0.1),
                                                  borderRadius:
                                                      BorderRadius.circular(12),
                                                ),
                                                child: const Icon(
                                                  Icons.class_outlined,
                                                  color: Color(0xFF2E6656),
                                                ),
                                              ),
                                              const SizedBox(width: 16),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      batch['name'] ??
                                                          'Unknown Batch',
                                                      style: const TextStyle(
                                                        fontSize: 16,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        color: Color(
                                                          0xFF1F2E27,
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Text(
                                                      '${batch['studentCount'] ?? 0} students enrolled',
                                                      style: TextStyle(
                                                        color: Colors
                                                            .grey
                                                            .shade600,
                                                        fontSize: 13,
                                                        fontWeight:
                                                            FontWeight.w500,
                                                      ),
                                                    ),
                                                    if ((batch['subjectNames']
                                                                as List<
                                                                  dynamic
                                                                >?)
                                                            ?.isNotEmpty ??
                                                        false) ...[
                                                      const SizedBox(height: 6),
                                                      Wrap(
                                                        spacing: 6,
                                                        runSpacing: 4,
                                                        children:
                                                            (batch['subjectNames']
                                                                    as List<
                                                                      dynamic
                                                                    >)
                                                                .map((name) {
                                                                  return Container(
                                                                    padding: const EdgeInsets.symmetric(
                                                                      horizontal:
                                                                          8,
                                                                      vertical:
                                                                          3,
                                                                    ),
                                                                    decoration: BoxDecoration(
                                                                      color:
                                                                          const Color(
                                                                            0xFF2E6656,
                                                                          ).withValues(
                                                                            alpha:
                                                                                0.08,
                                                                          ),
                                                                      borderRadius:
                                                                          BorderRadius.circular(
                                                                            8,
                                                                          ),
                                                                    ),
                                                                    child: Text(
                                                                      name.toString(),
                                                                      style: const TextStyle(
                                                                        color: Color(
                                                                          0xFF2E6656,
                                                                        ),
                                                                        fontSize:
                                                                            11,
                                                                        fontWeight:
                                                                            FontWeight.w600,
                                                                      ),
                                                                    ),
                                                                  );
                                                                })
                                                                .toList(),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                              ),
                                              if (batch['grade'] != null)
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 10,
                                                        vertical: 4,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: const Color(
                                                      0xFFA87D26,
                                                    ).withValues(alpha: 0.12),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          20,
                                                        ),
                                                  ),
                                                  child: Text(
                                                    batch['grade'].toString(),
                                                    style: const TextStyle(
                                                      color: Color(0xFFA87D26),
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ),
                                              PopupMenuButton<String>(
                                                icon: Icon(
                                                  Icons.more_vert,
                                                  color: Colors.grey.shade600,
                                                ),
                                                onSelected: (action) {
                                                  if (action == 'edit') {
                                                    showBatchFormBottomSheet(
                                                      context,
                                                      ref,
                                                      existing: batch,
                                                    );
                                                  } else if (action ==
                                                      'delete') {
                                                    _confirmDeleteBatch(
                                                      context,
                                                      ref,
                                                      batch,
                                                    );
                                                  }
                                                },
                                                itemBuilder: (context) => [
                                                  const PopupMenuItem(
                                                    value: 'edit',
                                                    child: Row(
                                                      children: [
                                                        Icon(
                                                          Icons.edit_outlined,
                                                          size: 18,
                                                        ),
                                                        SizedBox(width: 8),
                                                        Text('Edit'),
                                                      ],
                                                    ),
                                                  ),
                                                  const PopupMenuItem(
                                                    value: 'delete',
                                                    child: Row(
                                                      children: [
                                                        Icon(
                                                          Icons.delete_outline,
                                                          size: 18,
                                                          color: Colors.red,
                                                        ),
                                                        SizedBox(width: 8),
                                                        Text(
                                                          'Delete',
                                                          style: TextStyle(
                                                            color: Colors.red,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                }, childCount: batches.length),
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
        heroTag: null,
        onPressed: () => showBatchFormBottomSheet(context, ref),
        backgroundColor: const Color(0xFF1F2E27),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          'Create Batch',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteBatch(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> batch,
  ) async {
    final studentCount = (batch['studentCount'] as num?)?.toInt() ?? 0;
    final hasStudents = studentCount > 0;
    final batchName = batch['name']?.toString() ?? 'this batch';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(hasStudents ? 'This batch has students' : 'Delete batch?'),
        content: Text(
          hasStudents
              ? '$batchName has $studentCount student(s) enrolled, with attendance, fee, and timetable history attached. '
                    'It will be archived (hidden from your batch list) instead of permanently deleted, so none of that history is lost. Continue?'
              : '$batchName will be removed permanently. This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              hasStudents ? 'Archive' : 'Delete',
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await deleteBatch(ref.read(apiServiceProvider), batch['id'] as int);
      ref.invalidate(batchesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(hasStudents ? 'Batch archived.' : 'Batch removed.'),
          ),
        );
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

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
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
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              color: Color(0xFF1F2E27),
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// Shows the create/edit batch form. Pass `existing` (a batch map from
/// `batchesProvider`) to edit it in place; omit it to create a new batch.
/// After a brand-new batch is created, immediately opens the schedule editor
/// for it too — using this OUTER context (which outlives the form sheet),
/// not the form sheet's own context, since that's disposed the moment it
/// pops and can't safely be reused to open a follow-up sheet.
Future<void> showBatchFormBottomSheet(
  BuildContext context,
  WidgetRef ref, {
  Map<String, dynamic>? existing,
}) async {
  final result = await showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _BatchFormBottomSheet(existing: existing),
  );
  if (result == null || !context.mounted) return;

  final batchId = result['id'] as int?;
  final batchName = result['name']?.toString();
  final subjectIds = (result['subjectIds'] as List<dynamic>?)?.cast<int>();
  if (batchId != null && batchName != null && subjectIds != null) {
    await showBatchScheduleBottomSheet(
      context,
      ref,
      batchId: batchId,
      batchName: batchName,
      subjectIds: subjectIds,
    );
  }
}

class _BatchFormBottomSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic>? existing;
  const _BatchFormBottomSheet({this.existing});

  @override
  ConsumerState<_BatchFormBottomSheet> createState() =>
      _BatchFormBottomSheetState();
}

class _BatchFormBottomSheetState extends ConsumerState<_BatchFormBottomSheet> {
  late final _name = TextEditingController(
    text: widget.existing?['name']?.toString() ?? '',
  );
  late final _grade = TextEditingController(
    text: widget.existing?['grade']?.toString() ?? '',
  );
  late final Set<int> _selectedSubjectIds = {
    ...((widget.existing?['subjectIds'] as List<dynamic>?)?.cast<int>() ??
        const []),
  };
  late final _feeAmount = TextEditingController(
    text: widget.existing?['feeAmount']?.toString() ?? '',
  );
  late String? _billingCycle = widget.existing?['billingCycle']?.toString();
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.existing != null;

  @override
  void dispose() {
    _name.dispose();
    _grade.dispose();
    _feeAmount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Batch name is required.');
      return;
    }
    // A batch with no subjects means every student enrolled in it sees an
    // empty Learn tab — this is exactly the bug that slipped through when
    // this field was skippable, so it's now required.
    if (_selectedSubjectIds.isEmpty) {
      setState(
        () => _error =
            'Select at least one subject — students in this batch need it to see their Learn tab.',
      );
      return;
    }
    final feeAmountText = _feeAmount.text.trim();
    int? feeAmount;
    if (feeAmountText.isNotEmpty) {
      feeAmount = int.tryParse(feeAmountText);
      if (feeAmount == null || feeAmount < 0) {
        setState(() => _error = 'Enter a valid fee amount.');
        return;
      }
      if (_billingCycle == null) {
        setState(() => _error = 'Select a billing cycle for the batch fee.');
        return;
      }
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      Map<String, dynamic> savedBatch;
      if (_isEdit) {
        savedBatch = await updateBatch(
          api,
          widget.existing!['id'] as int,
          name: _name.text.trim(),
          grade: _grade.text.trim(),
          subjectIds: _selectedSubjectIds.toList(),
          feeAmount: feeAmount,
          billingCycle: feeAmount != null ? _billingCycle : null,
        );
      } else {
        savedBatch = await createBatch(
          api,
          name: _name.text.trim(),
          grade: _grade.text.trim(),
          subjectIds: _selectedSubjectIds.toList(),
          feeAmount: feeAmount,
          billingCycle: feeAmount != null ? _billingCycle : null,
        );
      }
      ref.invalidate(batchesProvider);
      if (!mounted) return;
      // Pop with the saved batch's data only on CREATE — the caller
      // (showBatchFormBottomSheet) uses this to immediately open the
      // schedule editor for a brand-new batch. Edits don't need this since
      // the batch already has a schedule the admin can open separately.
      Navigator.pop(context, _isEdit ? null : savedBatch);
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
                Text(
                  _isEdit ? 'Edit Batch' : 'Create New Batch',
                  style: const TextStyle(
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
                    label: 'Batch Name',
                    hint: 'e.g. Class 11 Morning',
                    controller: _name,
                    prefixIcon: Icons.class_outlined,
                  ),
                  const SizedBox(height: 16),
                  CustomTextField(
                    label: 'Grade/Class (Optional)',
                    hint: 'e.g. Class 11',
                    controller: _grade,
                    prefixIcon: Icons.grade_outlined,
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Subjects',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Set once here — every student in this batch gets these automatically.',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  const SizedBox(height: 10),
                  Consumer(
                    builder: (context, ref, _) {
                      final subjectsAsync = ref.watch(subjectsProvider);
                      return subjectsAsync.when(
                        loading: () => const LinearProgressIndicator(),
                        error: (e, _) => Text(
                          friendlyErrorMessage(e),
                          style: const TextStyle(
                            color: Colors.red,
                            fontSize: 12,
                          ),
                        ),
                        data: (subjects) {
                          if (subjects.isEmpty) {
                            return const Text(
                              'No subjects yet — add one from the Subjects screen first.',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            );
                          }
                          return Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: subjects.map<Widget>((s) {
                              final id = s['id'] as int;
                              final selected = _selectedSubjectIds.contains(id);
                              return FilterChip(
                                label: Text(s['name'] ?? ''),
                                selected: selected,
                                onSelected: (val) => setState(() {
                                  if (val) {
                                    _selectedSubjectIds.add(id);
                                  } else {
                                    _selectedSubjectIds.remove(id);
                                  }
                                }),
                                selectedColor: const Color(0xFF2E6656),
                                backgroundColor: Colors.white,
                                checkmarkColor: Colors.white,
                                labelStyle: TextStyle(
                                  color: selected
                                      ? Colors.white
                                      : const Color(0xFF1F2E27),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                  side: BorderSide(
                                    color: selected
                                        ? const Color(0xFF2E6656)
                                        : Colors.grey.shade300,
                                  ),
                                ),
                              );
                            }).toList(),
                          );
                        },
                      );
                    },
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Fee',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Optional — set a default fee for every student in this batch. '
                    'A student can still be given their own custom fee.',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  const SizedBox(height: 10),
                  CustomTextField(
                    label: 'Batch Fee (Optional)',
                    hint: 'e.g. 5000',
                    controller: _feeAmount,
                    prefixIcon: Icons.currency_rupee,
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 10),
                  _buildBillingCycleChips(),
                  if (_isEdit) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Weekly Schedule',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F2E27),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Set the days and times this batch meets each week.',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                    const SizedBox(height: 10),
                    if (_selectedSubjectIds.isEmpty)
                      Text(
                        'Select subjects first',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 12,
                        ),
                      )
                    else
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => showBatchScheduleBottomSheet(
                            context,
                            ref,
                            batchId: widget.existing!['id'] as int,
                            batchName: _name.text.trim(),
                            subjectIds: _selectedSubjectIds.toList(),
                          ),
                          icon: const Icon(
                            Icons.schedule,
                            color: Color(0xFF2E6656),
                          ),
                          label: const Text(
                            'Edit Schedule',
                            style: TextStyle(color: Color(0xFF2E6656)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF2E6656)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
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
                      text: _isEdit ? 'Save Changes' : 'Create Batch',
                      onPressed: _submit,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillingCycleChips() {
    const cycles = [
      ('monthly', 'Monthly'),
      ('quarterly', 'Quarterly'),
      ('yearly', 'Yearly'),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: cycles.map((c) {
        final (value, label) = c;
        final selected = _billingCycle == value;
        return FilterChip(
          label: Text(label),
          selected: selected,
          onSelected: (val) =>
              setState(() => _billingCycle = val ? value : null),
          selectedColor: const Color(0xFF2E6656),
          backgroundColor: Colors.white,
          checkmarkColor: Colors.white,
          labelStyle: TextStyle(
            color: selected ? Colors.white : const Color(0xFF1F2E27),
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(
              color: selected ? const Color(0xFF2E6656) : Colors.grey.shade300,
            ),
          ),
        );
      }).toList(),
    );
  }
}
