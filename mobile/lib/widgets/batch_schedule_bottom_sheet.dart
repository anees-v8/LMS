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
    useRootNavigator: true,
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
  int? _expandedIndex;
  int? _newlyAddedIndex;
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
    _expandedIndex = _entries!.isNotEmpty ? _entries!.length - 1 : null;
    _newlyAddedIndex = null;
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
      _newlyAddedIndex = _entries!.length - 1;
      _expandedIndex = _newlyAddedIndex;
    });
  }

  void _removeSlot(int index) {
    setState(() {
      _entries!.removeAt(index);
      if (_expandedIndex == index) {
        _expandedIndex = _entries!.isNotEmpty ? (_entries!.length - 1) : null;
      } else if (_expandedIndex != null && _expandedIndex! > index) {
        _expandedIndex = _expandedIndex! - 1;
      }
      if (_newlyAddedIndex == index) {
        _newlyAddedIndex = null;
      } else if (_newlyAddedIndex != null && _newlyAddedIndex! > index) {
        _newlyAddedIndex = _newlyAddedIndex! - 1;
      }
    });
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
      if (mounted) {
        final nav = Navigator.of(context, rootNavigator: true);
        if (nav.canPop()) {
          nav.pop();
        }
      }
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  Widget _buildSlotCard(int index, _ScheduleEntryDraft entry) {
    final isExpanded = _expandedIndex == index;
    final isNewlyAdded = _newlyAddedIndex == index;

    final subject = widget.subjects
        .where((s) => s['id'] == entry.subjectId)
        .firstOrNull;
    final subjectName = subject?['name']?.toString() ?? 'Select Subject';
    final dayName = _dayNames[entry.dayOfWeek.clamp(0, 6)];
    final timeStr = '${_fmt(entry.startTime)} – ${_fmt(entry.endTime)}';

    if (!isExpanded) {
      // Collapsed summary card
      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: InkWell(
          onTap: () => setState(() => _expandedIndex = index),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2E6656).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Slot ${index + 1}',
                    style: const TextStyle(
                      color: Color(0xFF2E6656),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$subjectName • $dayName',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: Color(0xFF1F2E27),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        timeStr,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    Icons.close,
                    size: 18,
                    color: Colors.grey,
                  ),
                  onPressed: () => _removeSlot(index),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  tooltip: 'Delete Slot',
                ),
                const SizedBox(width: 12),
                const Icon(
                  Icons.keyboard_arrow_down,
                  size: 22,
                  color: Colors.grey,
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Expanded card (highlighted if newly added)
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isNewlyAdded
            ? const Color(0xFF2E6656).withValues(alpha: 0.02)
            : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isNewlyAdded
              ? const Color(0xFF2E6656)
              : Colors.grey.shade300,
          width: isNewlyAdded ? 2.0 : 1.0,
        ),
        boxShadow: isNewlyAdded
            ? [
                BoxShadow(
                  color: const Color(0xFF2E6656).withValues(alpha: 0.12),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: isNewlyAdded
                      ? const Color(0xFF2E6656)
                      : const Color(0xFF2E6656).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Slot ${index + 1}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: isNewlyAdded ? Colors.white : const Color(0xFF2E6656),
                  ),
                ),
              ),
              if (isNewlyAdded) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFA87D26),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'NEW',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
              const Spacer(),
              IconButton(
                icon: const Icon(
                  Icons.keyboard_arrow_up,
                  size: 22,
                  color: Colors.grey,
                ),
                onPressed: () => setState(() => _expandedIndex = null),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                tooltip: 'Collapse',
              ),
              const SizedBox(width: 14),
              IconButton(
                icon: const Icon(Icons.close, size: 20, color: Colors.grey),
                onPressed: () => _removeSlot(index),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                tooltip: 'Delete Slot',
              ),
            ],
          ),
          const SizedBox(height: 12),
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
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.access_time,
                          color: Color(0xFF2E6656),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Start Time',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _fmt(entry.startTime),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Color(0xFF1F2E27),
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
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () => _pickTime(entry, false),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.access_time_filled,
                          color: Color(0xFF2E6656),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'End Time',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _fmt(entry.endTime),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Color(0xFF1F2E27),
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
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheduleAsync = ref.watch(batchScheduleProvider(widget.batchId));

    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 640,
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Container(
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
                  onPressed: () {
                    final nav = Navigator.of(context, rootNavigator: true);
                    if (nav.canPop()) {
                      nav.pop();
                    }
                  },
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
    ),
  ),
);
  }
}
