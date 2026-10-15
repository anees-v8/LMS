import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_dropdown.dart';
import '../../widgets/custom_textfield.dart';
import '../../utils/app_toast.dart';

/// Coaching Admin composes a notification for students or teachers in their
/// own institute — everyone (of that role), or filtered to one batch.
class BroadcastStudentsScreen extends ConsumerStatefulWidget {
  const BroadcastStudentsScreen({super.key});

  @override
  ConsumerState<BroadcastStudentsScreen> createState() =>
      _BroadcastStudentsScreenState();
}

class _BroadcastStudentsScreenState
    extends ConsumerState<BroadcastStudentsScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _targetRole = 'student';
  int? _batchId;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_title.text.trim().isEmpty) {
      const msg = 'Title is required.';
      setState(() => _error = msg);
      AppToast.showError(context, msg);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final result = await broadcastToStudents(
        ref.read(apiServiceProvider),
        title: _title.text.trim(),
        body: _body.text.trim(),
        batchId: _batchId,
        targetRole: _targetRole,
      );
      if (mounted) {
        final count = result['recipientCount'] ?? 0;
        final who = _targetRole == 'teacher' ? 'teacher(s)' : 'student(s)';
        AppToast.showSuccess(context, 'Sent to $count $who.');
        _title.clear();
        _body.clear();
        setState(() {
          _batchId = null;
          _sending = false;
        });
      }
    } catch (e) {
      final msg = friendlyErrorMessage(e);
      setState(() {
        _sending = false;
        _error = msg;
      });
      if (mounted) AppToast.showError(context, msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(batchesProvider);
    final isTeacher = _targetRole == 'teacher';
    final screenWidth = MediaQuery.of(context).size.width;
    final double hPadding = screenWidth >= 900 ? 36.0 : (screenWidth >= 650 ? 32.0 : 20.0);

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
              padding: EdgeInsets.only(
                left: hPadding,
                right: hPadding,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Send Announcement',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Broadcast to your students',
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
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 720),
                    child: SingleChildScrollView(
                      padding: EdgeInsets.symmetric(horizontal: hPadding, vertical: 20),
                      child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isTeacher
                            ? 'This goes to your teachers — everyone, or just those teaching one batch.'
                            : 'This goes to your students — everyone, or just one batch.',
                        style: const TextStyle(color: Colors.grey),
                      ),
                      if (_error != null) ...[
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
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
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Send to',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: _RoleTab(
                                label: 'Students',
                                icon: Icons.school_rounded,
                                selected: !isTeacher,
                                onTap: () => setState(() {
                                  _targetRole = 'student';
                                  _batchId = null;
                                }),
                              ),
                            ),
                            Expanded(
                              child: _RoleTab(
                                label: 'Teachers',
                                icon: Icons.badge_rounded,
                                selected: isTeacher,
                                onTap: () => setState(() {
                                  _targetRole = 'teacher';
                                  _batchId = null;
                                }),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      CustomTextField(
                        label: 'Title',
                        hint: 'e.g. Holiday tomorrow',
                        controller: _title,
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        label: 'Message (optional)',
                        hint: isTeacher
                            ? 'Details for the teachers'
                            : 'Details for the students',
                        controller: _body,
                      ),
                      const SizedBox(height: 12),
                      batchesAsync.when(
                        loading: () => const LinearProgressIndicator(),
                        error: (err, stack) => Text(
                          friendlyErrorMessage(err),
                          style: const TextStyle(color: Colors.red),
                        ),
                        data: (batches) => CustomDropdown<int?>(
                          label: 'Batch (optional)',
                          hint: 'Every batch',
                          value: _batchId,
                          options: [
                            const DropdownOption<int?>(
                              value: null,
                              label: 'Every batch',
                            ),
                            ...batches.cast<Map<String, dynamic>>().map(
                              (b) => DropdownOption<int?>(
                                value: b['id'] as int,
                                label: b['name']?.toString() ?? '',
                              ),
                            ),
                          ],
                          onChanged: (v) => setState(() => _batchId = v),
                        ),
                      ),
                      const SizedBox(height: 24),
                      _sending
                          ? const Center(child: CircularProgressIndicator())
                          : SizedBox(
                              height: 52,
                              width: double.infinity,
                              child: CustomButton(
                                text: 'Send',
                                onPressed: _send,
                              ),
                            ),
                    ],
                  ),
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
}

class _RoleTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _RoleTab({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 6,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected ? AppColors.primary : Colors.grey.shade500,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? AppColors.primary : Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
