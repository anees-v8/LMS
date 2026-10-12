import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../providers/payment_providers.dart';
import '../../providers/management_providers.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_dropdown.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';

/// Subscribe to a plan for the first time, or switch (upgrade/downgrade)
/// to a different plan/cycle. The student-count field is prefilled with
/// the tenant's current active-student count and is editable — raising it
/// just buys headroom to grow into, but lowering it below the current
/// active count is blocked server-side (MUST_SUSPEND_STUDENTS_FIRST) until
/// the admin actually suspends enough students, which they can do right
/// here via the inline list that appears on that error.
///
/// Shows a live quote — proration credit from the unused portion of the
/// current cycle, and (downgrade only) a fixed penalty — before any
/// payment is created.
class PlanChangeScreen extends ConsumerStatefulWidget {
  final int planCatalogId;
  final String planName;
  final String billingCycle;

  const PlanChangeScreen({
    super.key,
    required this.planCatalogId,
    required this.planName,
    required this.billingCycle,
  });

  @override
  ConsumerState<PlanChangeScreen> createState() => _PlanChangeScreenState();
}

class _PlanChangeScreenState extends ConsumerState<PlanChangeScreen> {
  late String _billingCycle;
  final _studentCountController = TextEditingController();
  Map<String, dynamic>? _quote;
  bool _loadingQuote = true;
  bool _processing = false;
  String? _error;
  bool _mustSuspendFirst = false;
  String? _orderId;
  late Razorpay _razorpay;

  @override
  void initState() {
    super.initState();
    _billingCycle = widget.billingCycle;
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    _loadQuote();
  }

  @override
  void dispose() {
    _razorpay.clear();
    _studentCountController.dispose();
    super.dispose();
  }

  int? get _enteredStudentCount =>
      int.tryParse(_studentCountController.text.trim());

  Future<void> _loadQuote({int? studentCount}) async {
    setState(() {
      _loadingQuote = true;
      _error = null;
      _mustSuspendFirst = false;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final quote = await quotePlanChange(
        api,
        planCatalogId: widget.planCatalogId,
        billingCycle: _billingCycle,
        studentCount: studentCount,
      );
      if (_studentCountController.text.trim().isEmpty) {
        _studentCountController.text = '${quote['studentCount']}';
      }
      setState(() {
        _quote = quote;
        _loadingQuote = false;
      });
    } catch (e) {
      setState(() {
        _error = friendlyErrorMessage(e);
        _mustSuspendFirst = e is ApiException && e.message.contains('Suspend');
        _loadingQuote = false;
      });
    }
  }

  void _onStudentCountChanged(String _) {
    final count = _enteredStudentCount;
    if (count == null || count <= 0) return;
    _loadQuote(studentCount: count);
  }

  Future<void> _startChange() async {
    final studentCount = _enteredStudentCount;
    setState(() {
      _processing = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final result = await requestPlanChange(
        api,
        planCatalogId: widget.planCatalogId,
        billingCycle: _billingCycle,
        studentCount: studentCount,
      );
      _orderId = result['orderId'] as String?;
      final amountPaise = result['amountPaise'] as int? ?? 0;

      if (amountPaise == 0) {
        // Fully covered by proration credit — confirm immediately.
        await _confirmChange(paymentId: null, signature: null);
        return;
      }

      if (result['mock'] == true) {
        final mockPaymentId =
            'pay_mock_${DateTime.now().millisecondsSinceEpoch}';
        await _confirmChange(paymentId: mockPaymentId, signature: 'mock_signature');
        return;
      }

      final options = {
        'key': result['keyId'],
        'amount': amountPaise,
        'name': 'Campus Subscription',
        'description': '${widget.planName} — ${_cycleLabel(_billingCycle)}',
        'order_id': _orderId,
      };
      _razorpay.open(options);
    } catch (e) {
      setState(() {
        _processing = false;
        _error = friendlyErrorMessage(e);
        _mustSuspendFirst = e is ApiException && e.message.contains('Suspend');
      });
    }
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    _confirmChange(paymentId: response.paymentId, signature: response.signature);
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    setState(() {
      _processing = false;
      _error = 'Payment failed: ${response.message}';
    });
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    setState(() => _processing = false);
  }

  Future<void> _confirmChange({String? paymentId, String? signature}) async {
    if (_orderId == null) return;
    try {
      final api = ref.read(apiServiceProvider);
      await confirmPlanChange(
        api,
        planCatalogId: widget.planCatalogId,
        billingCycle: _billingCycle,
        orderId: _orderId!,
        studentCount: _enteredStudentCount,
        paymentId: paymentId,
        signature: signature,
      );
      ref.invalidate(subscriptionStatusProvider);
      ref.invalidate(dashboardProvider);
      ref.invalidate(authProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('You are now on the ${widget.planName} plan.')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _processing = false;
          _error = friendlyErrorMessage(e);
        });
      }
    }
  }

  String _cycleLabel(String c) {
    switch (c) {
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return 'Monthly';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.planName,
                          style: const TextStyle(
                            fontFamily: 'Playfair Display',
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Review your bill before confirming',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    CustomDropdown<String>(
                      label: 'Billing Cycle',
                      hint: 'Select a billing cycle',
                      value: _billingCycle,
                      options: const [
                        DropdownOption(value: 'monthly', label: 'Monthly'),
                        DropdownOption(value: 'quarterly', label: 'Quarterly'),
                        DropdownOption(value: 'yearly', label: 'Yearly'),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setState(() => _billingCycle = v);
                        _loadQuote(studentCount: _enteredStudentCount);
                      },
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      label: 'Number of Students',
                      hint: 'e.g. 50',
                      controller: _studentCountController,
                      prefixIcon: Icons.groups_outlined,
                      keyboardType: TextInputType.number,
                      onChanged: _onStudentCountChanged,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "This is what you'll be billed for. It can't go below your current active-student count unless you suspend students first.",
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                    ),
                    const SizedBox(height: 20),
                    if (_loadingQuote)
                      const Center(child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ))
                    else if (_quote != null)
                      _buildQuoteCard(_quote!),
                    if (_mustSuspendFirst) ...[
                      const SizedBox(height: 16),
                      const _InlineSuspendList(),
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
                            const Icon(Icons.error_outline, color: Colors.red, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _error!,
                                style: const TextStyle(color: Colors.red, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 28),
                    if (_processing)
                      const Center(child: CircularProgressIndicator())
                    else
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: CustomButton(
                          text: _quote?['direction'] == 'upgrade'
                              ? 'Confirm Upgrade'
                              : _quote?['direction'] == 'downgrade'
                                  ? 'Confirm Downgrade'
                                  : 'Subscribe',
                          onPressed: _quote == null || _mustSuspendFirst
                              ? null
                              : _startChange,
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

  Widget _buildQuoteCard(Map<String, dynamic> quote) {
    final studentCount = quote['studentCount'] as int? ?? 0;
    final newCycleAmount = quote['newCycleAmount'] as int? ?? 0;
    final prorationCredit = quote['prorationCredit'] as int? ?? 0;
    final penaltyAmount = quote['penaltyAmount'] as int? ?? 0;
    final amountDue = quote['amountDue'] as int? ?? 0;
    final direction = quote['direction']?.toString() ?? 'same';

    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (direction != 'same')
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (direction == 'upgrade' ? Colors.green : Colors.orange)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  direction == 'upgrade' ? 'UPGRADE' : 'DOWNGRADE',
                  style: TextStyle(
                    color: direction == 'upgrade' ? Colors.green.shade700 : Colors.orange.shade800,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            _row('Students billed', '$studentCount'),
            const Divider(height: 24),
            _row('Plan amount (${_cycleLabel(_billingCycle)})', '₹$newCycleAmount'),
            if (prorationCredit > 0)
              _row('Credit from current cycle', '− ₹$prorationCredit', valueColor: Colors.green.shade700),
            if (penaltyAmount > 0)
              _row('Downgrade penalty', '+ ₹$penaltyAmount', valueColor: Colors.red.shade700),
            const Divider(height: 24),
            _row('Amount due now', '₹$amountDue', bold: true),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade700, fontSize: bold ? 16 : 14)),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.w600,
              fontSize: bold ? 18 : 14,
              color: valueColor ?? const Color(0xFF1F2E27),
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact inline student list with a Suspend/Unsuspend action — shown when
/// the backend rejects a student-count reduction, so the admin can act
/// immediately instead of leaving this screen to find the Students tab.
class _InlineSuspendList extends ConsumerWidget {
  const _InlineSuspendList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(studentsProvider);
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.orange.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.orange, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Suspend students here to bring your active count down, then edit the number above.',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            studentsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text(friendlyErrorMessage(err)),
              data: (students) => Column(
                children: students.cast<Map<String, dynamic>>().map((s) {
                  final isActive = s['isActive'] != false;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(s['fullName']?.toString() ?? ''),
                    subtitle: Text(isActive ? 'Active' : 'Suspended'),
                    trailing: TextButton(
                      onPressed: () async {
                        try {
                          final api = ref.read(apiServiceProvider);
                          await suspendStudent(api, s['id'] as int);
                          ref.invalidate(studentsProvider);
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(friendlyErrorMessage(e))),
                            );
                          }
                        }
                      },
                      child: Text(isActive ? 'Suspend' : 'Unsuspend'),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
