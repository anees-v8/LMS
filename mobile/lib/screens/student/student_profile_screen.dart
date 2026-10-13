import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/profile/profile_header.dart';
import '../../widgets/profile/profile_info_card.dart';
import '../../widgets/profile/profile_menu_list.dart';
import '../../widgets/profile/profile_notification_toggle.dart';
import '../../widgets/profile/profile_logout_button.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../providers/auth_provider.dart';

class StudentProfileScreen extends ConsumerWidget {
  const StudentProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider);
    final feesAsync = ref.watch(studentFeesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(
            friendlyErrorMessage(e),
            style: const TextStyle(color: Colors.grey),
          ),
        ),
        data: (profile) {
          final studentName = profile['fullName'] as String? ?? 'Student';
          final phone = profile['phone'] as String? ?? 'Not provided';
          final batch = profile['batchName'] as String? ?? 'No batch';
          final rollNoStr = profile['rollNo'] != null
              ? 'Roll No: ${profile['rollNo']}'
              : 'No Roll No';
          final parentPhone =
              profile['parentPhone'] as String? ?? 'Not provided';

          final attendancePct = profile['attendancePct'] as int? ?? 0;
          final testsGiven = profile['testsGiven'] as int? ?? 0;
          final avgScore = profile['avgScore'] as int?;

          final feeSubtitle = feesAsync.maybeWhen(
            data: (fees) {
              final paid = fees['paid'] as int? ?? 0;
              final pending = fees['pending'] as int? ?? 0;
              final total = fees['total'] as int? ?? 0;
              if (total == 0) {
                return 'No fees assigned';
              } else if (pending == 0) {
                return 'All fees paid (₹$paid)';
              } else {
                return 'Paid ₹$paid • Pending ₹$pending';
              }
            },
            orElse: () => 'View fee payments and receipts',
          );

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: ProfileHeader(
                  name: studentName,
                  subtitleLine1: batch,
                  subtitleLine2: rollNoStr,
                  stats: [
                    ProfileStat(label: 'Attendance', value: '$attendancePct%'),
                    ProfileStat(label: 'Tests Given', value: '$testsGiven'),
                    ProfileStat(
                      label: 'Avg Score',
                      value: avgScore != null ? '$avgScore%' : '--',
                    ),
                  ],
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: ProfileInfoCard(
                    rows: [
                      ProfileInfoRowData(
                        icon: Icons.phone_rounded,
                        label: 'Phone',
                        value: phone,
                      ),
                      ProfileInfoRowData(
                        icon: Icons.family_restroom_rounded,
                        label: 'Parent Contact',
                        value: parentPhone,
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: ProfileMenuList(
                    items: [
                      ProfileMenuItemData(
                        icon: Icons.calendar_month_rounded,
                        iconBg: AppColors.successLight,
                        iconColor: AppColors.success,
                        label: 'My Attendance',
                        subtitle: 'View monthly calendar report',
                        onTap: () => _showAttendanceSheet(context),
                      ),
                      ProfileMenuItemData(
                        icon: Icons.analytics_rounded,
                        iconBg: AppColors.infoLight,
                        iconColor: AppColors.info,
                        label: 'Performance Analytics',
                        subtitle: 'Subject-wise score breakdown',
                        onTap: () => _showPerformanceSheet(context),
                      ),
                      ProfileMenuItemData(
                        icon: Icons.account_balance_wallet_rounded,
                        iconBg: AppColors.warningLight,
                        iconColor: Colors.orange,
                        label: 'Fee Details',
                        subtitle: feeSubtitle,
                        onTap: () => _showFeesSheet(context),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: ProfileNotificationToggle(),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
                  child: const ProfileLogoutButton(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAttendanceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AttendanceSheet(),
    );
  }

  void _showPerformanceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _PerformanceSheet(),
    );
  }

  void _showFeesSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FeesSheet(),
    );
  }
}

// ─── Bottom Sheets (role-specific, not shared) ─────────────────────────────

class _AttendanceSheet extends ConsumerWidget {
  // ignore: prefer_const_constructors_in_immutables
  _AttendanceSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceAsync = ref.watch(studentAttendanceProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'My Attendance',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: attendanceAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(friendlyErrorMessage(e))),
                data: (monthly) {
                  if (monthly.isEmpty) {
                    return const Center(
                      child: Text('No attendance data available.'),
                    );
                  }
                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: monthly.map((m) {
                      final monthName = m['month'] as String;
                      final total = m['total'] as int;
                      final present = m['present'] as int;
                      final pct = total > 0
                          ? (present / total * 100).toInt()
                          : 0;
                      final color = pct >= 75
                          ? AppColors.success
                          : pct >= 50
                          ? Colors.orange
                          : AppColors.error;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    monthName.trim(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Present: $present / $total days',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$pct%',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: color,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PerformanceSheet extends ConsumerWidget {
  // ignore: prefer_const_constructors_in_immutables
  _PerformanceSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final performanceAsync = ref.watch(studentPerformanceProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Performance Analytics',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: performanceAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(friendlyErrorMessage(e))),
                data: (subjects) {
                  if (subjects.isEmpty) {
                    return const Center(
                      child: Text('No performance data available.'),
                    );
                  }
                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: subjects.map((s) {
                      final subjectName = s['subject'] as String;
                      final score = s['obtainedMarks'] as int;
                      final max = s['totalMarks'] as int;
                      final pct = max > 0 ? score / max : 0.0;
                      final color = pct >= 0.75
                          ? AppColors.success
                          : pct >= 0.5
                          ? Colors.orange
                          : AppColors.error;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    subjectName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryDark,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: LinearProgressIndicator(
                                      value: pct,
                                      backgroundColor: Colors.grey.shade200,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        color,
                                      ),
                                      minHeight: 7,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 14),
                            Text(
                              '$score/$max',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: color,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeesSheet extends ConsumerWidget {
  // ignore: prefer_const_constructors_in_immutables
  _FeesSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feesAsync = ref.watch(studentFeesProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Fee Details',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: feesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(friendlyErrorMessage(e))),
                data: (feesData) {
                  final total = feesData['total'] as int? ?? 0;
                  final paid = feesData['paid'] as int? ?? 0;
                  final pending = feesData['pending'] as int? ?? 0;
                  final onlinePaymentEnabled =
                      feesData['onlinePaymentEnabled'] as bool? ?? false;
                  final payments =
                      (feesData['payments'] as List<dynamic>?) ?? [];

                  return ListView(
                    controller: controller,
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1F2E27), Color(0xFF2E6656)],
                          ),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Total Fees',
                                    style: TextStyle(
                                      color: Colors.white.withValues(
                                        alpha: 0.7,
                                      ),
                                      fontSize: 11,
                                    ),
                                  ),
                                  Text(
                                    '₹$total',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 22,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'Paid',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  '₹$paid',
                                  style: const TextStyle(
                                    color: Color(0xFFA87D26),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                Text(
                                  'Pending: ₹$pending',
                                  style: TextStyle(
                                    color: AppColors.error.withValues(
                                      alpha: 0.85,
                                    ),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (pending > 0) ...[
                        const SizedBox(height: 16),
                        if (onlinePaymentEnabled)
                          ElevatedButton.icon(
                            icon: const Icon(Icons.payment_rounded, size: 20),
                            label: const Text(
                              'Pay Fees Online',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFA87D26),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () {
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) =>
                                    _StudentPayFeeSheet(pendingAmount: pending),
                              );
                            },
                          )
                        else
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.amber.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.amber.shade200),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline,
                                    size: 20, color: Colors.amber.shade800),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: Text(
                                    'Online fee payment is not enabled yet by your institute. Please pay at the administration counter.',
                                    style: TextStyle(
                                        fontSize: 12, color: Colors.black87),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                      const SizedBox(height: 20),
                      const Text(
                        'Payment History',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (payments.isEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(
                            child: Text(
                              'No payment history found',
                              style: TextStyle(color: Colors.grey),
                            ),
                          ),
                        ),
                      ] else ...[
                        ...payments.map((p) {
                          final pDateStr = p['paidOn']?.toString() ?? '';
                          final pDate =
                              DateTime.tryParse(pDateStr) ?? DateTime.now();
                          final formattedDate =
                              '${pDate.day} ${_getMonth(pDate.month)} ${pDate.year}';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.check_circle_rounded,
                                  color: AppColors.success,
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        p['receiptNo']?.toString() ?? 'Receipt',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primaryDark,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        formattedDate,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '₹${p['amount']}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.success,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getMonth(int m) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (m >= 1 && m <= 12) return months[m - 1];
    return '';
  }
}

class _StudentPayFeeSheet extends ConsumerStatefulWidget {
  final int pendingAmount;
  const _StudentPayFeeSheet({required this.pendingAmount});

  @override
  ConsumerState<_StudentPayFeeSheet> createState() =>
      _StudentPayFeeSheetState();
}

class _StudentPayFeeSheetState extends ConsumerState<_StudentPayFeeSheet> {
  late final TextEditingController _amountController;
  late Razorpay _razorpay;
  String? _orderId;
  int _currentPayAmount = 0;
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: '${widget.pendingAmount}');
    _validateAmount('${widget.pendingAmount}');

    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _razorpay.clear();
    super.dispose();
  }

  void _validateAmount(String input) {
    final parsed = int.tryParse(input.trim());
    setState(() {
      if (parsed == null || parsed <= 0) {
        _errorMessage = 'Please enter a valid amount';
        _currentPayAmount = 0;
      } else if (parsed > widget.pendingAmount) {
        _errorMessage =
            'Amount cannot exceed pending fees of ₹${widget.pendingAmount}';
        _currentPayAmount = 0;
      } else {
        _errorMessage = null;
        _currentPayAmount = parsed;
      }
    });
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    try {
      final api = ref.read(apiServiceProvider);
      await verifyStudentFeePayment(
        api,
        orderId: response.orderId ?? _orderId ?? '',
        paymentId: response.paymentId ?? '',
        signature: response.signature,
        amount: _currentPayAmount,
      );

      ref.invalidate(studentFeesProvider);
      ref.invalidate(studentDashboardProvider);

      if (mounted) {
        Navigator.pop(context); // close pay sheet
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            icon: const Icon(
              Icons.check_circle_rounded,
              color: AppColors.success,
              size: 54,
            ),
            title: const Text('Payment Successful!'),
            content: Text(
              'Payment of ₹$_currentPayAmount has been recorded. An official fee receipt has been sent to your email and saved in your profile.',
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1F2E27),
                  foregroundColor: Colors.white,
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Verification error: ${friendlyErrorMessage(e)}'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Payment cancelled or failed: ${response.message ?? "Unknown error"}',
          ),
        ),
      );
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Wallet selected: ${response.walletName}')),
      );
    }
  }

  Future<void> _startPayment() async {
    if (_currentPayAmount <= 0 || _currentPayAmount > widget.pendingAmount) {
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final api = ref.read(apiServiceProvider);
      final auth = ref.read(authProvider);
      final orderResult =
          await createStudentFeeOrder(api, _currentPayAmount);

      _orderId = orderResult['orderId'] as String?;

      if (orderResult['mock'] == true) {
        // Dev mock fallback
        final mockPaymentId =
            'pay_mock_${DateTime.now().millisecondsSinceEpoch}';
        _handlePaymentSuccess(
          PaymentSuccessResponse(
            mockPaymentId,
            _orderId,
            'mock_signature',
            null,
          ),
        );
        return;
      }

      final options = {
        'key': orderResult['keyId'],
        'amount': orderResult['amount'],
        'name': auth.instituteName ?? 'Institute Fees',
        'description': 'Student Fee Payment',
        'order_id': orderResult['orderId'],
        'prefill': {
          'contact': auth.phone ?? '',
          'email': auth.email ?? '',
        },
        'theme': {'color': '#1F2E27'},
      };

      _razorpay.open(options);
    } catch (e) {
      setState(() => _isProcessing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Payment initiation failed: ${friendlyErrorMessage(e)}',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Pay Institute Fees',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryDark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Total Pending Balance: ₹${widget.pendingAmount}',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 20),

            // ── Amount Input ──────────────────────────────────────────
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              autofocus: true,
              onChanged: _validateAmount,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryDark,
              ),
              decoration: InputDecoration(
                prefixText: '₹ ',
                prefixStyle: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
                labelText: 'Payment Amount',
                errorText: _errorMessage,
                hintText: '${widget.pendingAmount}',
                helperText: 'Max payable: ₹${widget.pendingAmount}',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: const OutlineInputBorder(
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                  borderSide: BorderSide(color: Color(0xFFA87D26), width: 2),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Quick select chips
            Wrap(
              spacing: 8,
              children: [
                ActionChip(
                  label: Text('Full Amount (₹${widget.pendingAmount})'),
                  backgroundColor:
                      const Color(0xFFA87D26).withValues(alpha: 0.1),
                  labelStyle: const TextStyle(
                    color: Color(0xFFA87D26),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  onPressed: () {
                    _amountController.text = '${widget.pendingAmount}';
                    _validateAmount('${widget.pendingAmount}');
                  },
                ),
                if (widget.pendingAmount > 2000) ...[
                  ActionChip(
                    label: const Text('₹1,000'),
                    onPressed: () {
                      _amountController.text = '1000';
                      _validateAmount('1000');
                    },
                  ),
                  if (widget.pendingAmount > 5000)
                    ActionChip(
                      label: const Text('₹5,000'),
                      onPressed: () {
                        _amountController.text = '5000';
                        _validateAmount('5000');
                      },
                    ),
                ],
              ],
            ),

            const SizedBox(height: 24),

            if (_isProcessing)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else
              ElevatedButton(
                onPressed: (_currentPayAmount > 0 &&
                        _currentPayAmount <= widget.pendingAmount)
                    ? _startPayment
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFA87D26),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  disabledForegroundColor: Colors.grey.shade500,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _currentPayAmount > 0
                      ? 'Proceed to Pay ₹$_currentPayAmount'
                      : 'Enter Valid Amount',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }
}
