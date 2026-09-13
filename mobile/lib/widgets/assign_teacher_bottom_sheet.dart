import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/management_providers.dart';
import '../services/api_service.dart';
import 'custom_dropdown.dart';

/// Shows the "Assign to Batch" bottom sheet for a teacher — picks a batch,
/// then a subject filtered to that batch's own subjects, and calls
/// [assignTeacherToBatch]. Matches the backend's assignTeacherSchema
/// (`{teacherUserId, batchId, subjectId}`), which hard-blocks on a day/time
/// clash with the teacher's other assignments (409 TEACHER_SCHEDULE_CLASH)
/// or a duplicate assignment (409 ALREADY_ASSIGNED).
Future<void> showAssignTeacherBottomSheet(
  BuildContext context,
  WidgetRef ref, {
  required int teacherUserId,
  required String teacherName,
}) async {
  final batches = await ref.read(batchesProvider.future);
  if (!context.mounted) return;
  if (batches.isEmpty) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Create a batch first.')));
    return;
  }
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _AssignTeacherBottomSheet(
      teacherUserId: teacherUserId,
      teacherName: teacherName,
      batches: batches.cast<Map<String, dynamic>>(),
    ),
  );
}

class _AssignTeacherBottomSheet extends ConsumerStatefulWidget {
  final int teacherUserId;
  final String teacherName;
  final List<Map<String, dynamic>> batches;

  const _AssignTeacherBottomSheet({
    required this.teacherUserId,
    required this.teacherName,
    required this.batches,
  });

  @override
  ConsumerState<_AssignTeacherBottomSheet> createState() =>
      _AssignTeacherBottomSheetState();
}

class _AssignTeacherBottomSheetState
    extends ConsumerState<_AssignTeacherBottomSheet> {
  int? _batchId;
  int? _subjectId;
  bool _saving = false;
  String? _error;

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
    if (_batchId == null || _subjectId == null) {
      setState(() => _error = 'Batch and subject are required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await assignTeacherToBatch(
        ref.read(apiServiceProvider),
        teacherUserId: widget.teacherUserId,
        batchId: _batchId!,
        subjectId: _subjectId!,
      );
      ref.invalidate(
        teacherAssignmentsProvider((
          teacherId: widget.teacherUserId,
          batchId: null,
        )),
      );
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
                Expanded(
                  child: Text(
                    'Assign ${widget.teacherName}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2E27),
                    ),
                    overflow: TextOverflow.ellipsis,
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
                    child: ElevatedButton(
                      onPressed: _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1F2E27),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Assign',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
