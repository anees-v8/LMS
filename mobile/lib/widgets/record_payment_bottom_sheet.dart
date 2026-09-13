import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/management_providers.dart';
import '../providers/superadmin_providers.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import 'custom_dropdown.dart';

Future<void> showRecordPaymentBottomSheet(
  BuildContext context,
  WidgetRef ref, {
  int? prefillStudentId,
}) async {
  final students = await ref.read(studentsProvider.future);
  if (!context.mounted) return;

  if (students.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No students found. Add a student first.')),
    );
    return;
  }

  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => RecordPaymentBottomSheet(
      students: students.cast<Map<String, dynamic>>(),
      prefillStudentId: prefillStudentId,
    ),
  );
}

class RecordPaymentBottomSheet extends ConsumerStatefulWidget {
  final List<Map<String, dynamic>> students;
  final int? prefillStudentId;

  const RecordPaymentBottomSheet({
    Key? key,
    required this.students,
    this.prefillStudentId,
  }) : super(key: key);

  @override
  ConsumerState<RecordPaymentBottomSheet> createState() =>
      _RecordPaymentBottomSheetState();
}

class _RecordPaymentBottomSheetState
    extends ConsumerState<RecordPaymentBottomSheet> {
  final _amount = TextEditingController();
  int? _studentId;
  String _method = 'cash';
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.prefillStudentId != null &&
        widget.students.any((s) => s['id'] == widget.prefillStudentId)) {
      _studentId = widget.prefillStudentId;
    } else if (widget.students.isNotEmpty) {
      _studentId = widget.students.first['id'] as int?;
    }
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = int.tryParse(_amount.text.trim());
    if (_studentId == null || amount == null || amount < 1) {
      setState(() => _error = 'Choose a student and enter a valid amount.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await recordPayment(
        ref.read(apiServiceProvider),
        studentId: _studentId!,
        amountPaid: amount,
        method: _method,
      );
      ref.invalidate(feesProvider);
      ref.invalidate(feeAnalyticsProvider);
      // Students list shows a per-student pending-fee amount too — without
      // this, it keeps showing the pre-payment amount until something else
      // happens to refetch it.
      ref.invalidate(studentsProvider);

      // Also invalidate the detailed student view to see the new fee
      if (widget.prefillStudentId != null) {
        ref.invalidate(studentDetailsProvider(widget.prefillStudentId!));
      }

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
            decoration: const BoxDecoration(
              color: Color(0xFFF4F6F3),
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
        keyboardType: TextInputType.number,
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
              const SizedBox(width: 16),
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
          color: Color(0xFFF8F9FA),
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
                      const CircleAvatar(
                        backgroundColor: Color(0xFFF4F6F3),
                        radius: 24,
                        child: Icon(
                          Icons.payments_outlined,
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
                        const Text(
                          'Record Payment',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2E27),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Fill in the details to record a new fee payment',
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
                            'Student Information',
                            'Select the student for payment',
                          ),
                          CustomDropdown<int>(
                            label: 'Student *',
                            hint: 'Select Student',
                            value: _studentId,
                            prefixIcon: Icons.people_outline,
                            enabled: widget.prefillStudentId == null,
                            options: widget.students
                                .map(
                                  (s) => DropdownOption<int>(
                                    value: s['id'] as int,
                                    label: s['fullName']?.toString() ?? '',
                                  ),
                                )
                                .toList(),
                            onChanged: (v) => setState(() => _studentId = v),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          _buildSectionHeader(
                            Icons.payment,
                            'Payment Details',
                            'Amount and payment method',
                          ),
                          _buildInputField(
                            controller: _amount,
                            hint: 'Amount Paid (${Constants.currencySymbol})',
                            prefixIcon: Icons.currency_rupee,
                            isRequired: true,
                          ),
                          CustomDropdown<String>(
                            label: 'Method *',
                            hint: 'Select Method',
                            value: _method,
                            prefixIcon: Icons.account_balance_wallet_outlined,
                            options: const [
                              DropdownOption(value: 'cash', label: 'Cash'),
                              DropdownOption(value: 'upi', label: 'UPI'),
                              DropdownOption(value: 'card', label: 'Card'),
                            ],
                            onChanged: (v) =>
                                setState(() => _method = v ?? 'cash'),
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
                          color: Color(0xFF1F2E27),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1F2E27),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: _saving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'Record Payment',
                              style: TextStyle(fontWeight: FontWeight.bold),
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
