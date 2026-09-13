import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/management_providers.dart';
import '../services/api_service.dart';
import 'custom_dropdown.dart';

const _dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/// Shows the "Edit Schedule" bottom sheet for a batch — lets the admin build
/// the batch's full weekly schedule (subject + day + start/end time per
/// slot), matching the backend's full-replace `PUT /admin/batches/:id/schedule`.
/// [subjectIds] must be the batch's own subject IDs (already known by the
/// caller from the batch form) — schedule entries can only use one of these,
/// matching the backend's validation.
Future<void> showBatchScheduleBottomSheet(
  BuildContext context,
  WidgetRef ref, {
  required int batchId,
  required String batchName,
  required List<int> subjectIds,
}) async {
  final subjects = await ref.read(subjectsProvider.future);
  final batchSubjects = subjects
      .cast<Map<String, dynamic>>()
      .where((s) => subjectIds.contains(s['id'] as int))
      .toList();
  if (!context.mounted) return;
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _BatchScheduleBottomSheet(
      batchId: batchId,
      batchName: batchName,
      subjects: batchSubjects,
    ),
  );
}

class _ScheduleEntryDraft {
  int? subjectId;
  int dayOfWeek;
  TimeOfDay startTime;
  TimeOfDay endTime;

  _ScheduleEntryDraft({
    this.subjectId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
  });
}

class _BatchScheduleBottomSheet extends ConsumerStatefulWidget {
  final int batchId;
  final String batchName;
  final List<Map<String, dynamic>> subjects;

  const _BatchScheduleBottomSheet({
    required this.batchId,
    required this.batchName,
    required this.subjects,
  });

  @override
  ConsumerState<_BatchScheduleBottomSheet> createState() =>
      _BatchScheduleBottomSheetState();
}

class _BatchScheduleBottomSheetState
    extends ConsumerState<_BatchScheduleBottomSheet> {
  List<_ScheduleEntryDraft>? _entries;
  bool _saving = false;
  String? _error;

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  void _initFromExisting(List<dynamic> existing) {
    _entries = existing.map((e) {
      final map = e as Map<String, dynamic>;
      final start = (map['startTime']?.toString() ?? '09:00').split(':');
      final end = (map['endTime']?.toString() ?? '10:00').split(':');
      return _ScheduleEntryDraft(
        subjectId: map['subjectId'] as int?,
        dayOfWeek: map['dayOfWeek'] as int? ?? 0,
        startTime: TimeOfDay(
          hour: int.tryParse(start[0]) ?? 9,
          minute: int.tryParse(start.length > 1 ? start[1] : '0') ?? 0,
        ),
        endTime: TimeOfDay(
          hour: int.tryParse(end[0]) ?? 10,
          minute: int.tryParse(end.length > 1 ? end[1] : '0') ?? 0,
        ),
      );
    }).toList();
  }

  void _addSlot() {
    setState(() {
      _entries ??= [];
      _entries!.add(
        _ScheduleEntryDraft(
          subjectId: widget.subjects.isNotEmpty
              ? widget.subjects.first['id'] as int
              : null,
          dayOfWeek: DateTime.now().weekday % 7,
          startTime: const TimeOfDay(hour: 9, minute: 0),
          endTime: const TimeOfDay(hour: 10, minute: 0),
        ),
      );
    });
  }

  void _removeSlot(int index) {
    setState(() => _entries!.removeAt(index));
  }

  Future<void> _pickTime(_ScheduleEntryDraft entry, bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? entry.startTime : entry.endTime,
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        entry.startTime = picked;
      } else {
        entry.endTime = picked;
      }
    });
  }

  Future<void> _submit() async {
    final entries = _entries ?? [];
    for (final e in entries) {
      if (e.subjectId == null) {
        setState(() => _error = 'Every slot needs a subject selected.');
        return;
      }
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await setBatchSchedule(
        ref.read(apiServiceProvider),
        widget.batchId,
        entries
            .map(
              (e) => {
                'subjectId': e.subjectId,
                'dayOfWeek': e.dayOfWeek,
                'startTime': _fmt(e.startTime),
                'endTime': _fmt(e.endTime),
              },
            )
            .toList(),
      );
      ref.invalidate(batchScheduleProvider(widget.batchId));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  Widget _buildSlotCard(int index, _ScheduleEntryDraft entry) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                'Slot ${index + 1}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: Color(0xFF1F2E27),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close, size: 20, color: Colors.grey),
                onPressed: () => _removeSlot(index),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          CustomDropdown<int>(
            label: 'Subject',
            hint: 'Select subject',
            prefixIcon: Icons.menu_book,
            value: entry.subjectId,
            options: widget.subjects
                .map(
                  (s) => DropdownOption<int>(
                    value: s['id'] as int,
                    label: s['name']?.toString() ?? '',
                  ),
                )
                .toList(),
            onChanged: (v) => setState(() => entry.subjectId = v),
          ),
          const SizedBox(height: 12),
          CustomDropdown<int>(
            label: 'Day',
            hint: 'Select day',
            prefixIcon: Icons.calendar_today_outlined,
            value: entry.dayOfWeek,
            options: List.generate(
              7,
              (i) => DropdownOption<int>(value: i, label: _dayNames[i]),
            ),
            onChanged: (v) =>
                setState(() => entry.dayOfWeek = v ?? entry.dayOfWeek),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => _pickTime(entry, true),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          color: Colors.grey.shade600,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Start: ${_fmt(entry.startTime)}',
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () => _pickTime(entry, false),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.access_time_filled,
                          color: Colors.grey.shade600,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'End: ${_fmt(entry.endTime)}',
                            style: const TextStyle(fontWeight: FontWeight.w500),
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
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheduleAsync = ref.watch(batchScheduleProvider(widget.batchId));

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
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle — consistent with every other bottom sheet in the app.
            Center(
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                height: 4,
                width: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Edit Schedule',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            Text(
              widget.batchName,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 16),
            Flexible(
              child: scheduleAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, stack) =>
                    Center(child: Text(friendlyErrorMessage(err))),
                data: (existing) {
                  if (_entries == null) _initFromExisting(existing);
                  final entries = _entries!;
                  return SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (entries.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Text(
                              'No schedule slots yet. Tap "Add Slot" to add the first one.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          )
                        else
                          for (var i = 0; i < entries.length; i++)
                            _buildSlotCard(i, entries[i]),
                        OutlinedButton.icon(
                          onPressed: _addSlot,
                          icon: const Icon(Icons.add, color: Color(0xFF2E6656)),
                          label: const Text(
                            'Add Slot',
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
                        const SizedBox(height: 16),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            _saving
                ? const Center(child: CircularProgressIndicator())
                : SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _entries == null ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1F2E27),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Save Schedule',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}
