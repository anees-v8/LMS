import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/payment_providers.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_button.dart';
import 'package:intl/intl.dart';
import 'browse_plans_screen.dart';
import '../../services/receipt_service.dart';

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subAsync = ref.watch(subscriptionStatusProvider);
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
                    'Subscription & Billing',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your current plan and payment history',
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
                child: subAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (sub) {
                    final status = sub['status'] ?? 'unknown';
                    final planName = sub['plan'] ?? 'Unknown Plan';
                    final billingCycle = sub['billingCycle'] ?? 'monthly';

                    final isTrial =
                        status == 'trial' || status == 'trial_expired';
                    final trialEndsStr = sub['trialEndsAt'];
                    final trialEndsAt = trialEndsStr != null
                        ? DateTime.tryParse(trialEndsStr)
                        : null;

                    final nextBillingStr = sub['nextBillingDate'];
                    final nextBillingDate = nextBillingStr != null
                        ? DateTime.tryParse(nextBillingStr)
                        : null;

                    final today = DateTime.now();
                    final startOfToday = DateTime(
                      today.year,
                      today.month,
                      today.day,
                    );

                    int daysLeft = 0;
                    bool ended = false;

                    if (isTrial) {
                      if (trialEndsAt != null) {
                        final endOfTrial = DateTime(
                          trialEndsAt.year,
                          trialEndsAt.month,
                          trialEndsAt.day,
                        );
                        daysLeft = endOfTrial.difference(startOfToday).inDays;
                      }
                      ended =
                          daysLeft < 0 ||
                          status == 'trial_expired' ||
                          status == 'past_due' ||
                          status == 'expired';
                    } else {
                      if (nextBillingDate != null) {
                        final endOfSub = DateTime(
                          nextBillingDate.year,
                          nextBillingDate.month,
                          nextBillingDate.day,
                        );
                        daysLeft = endOfSub.difference(startOfToday).inDays;
                      }
                      ended =
                          daysLeft < 0 ||
                          status == 'past_due' ||
                          status == 'expired';
                    }

                    final statusColor = ended
                        ? Colors.red
                        : (isTrial ? Colors.orange : Colors.green);
                    final statusText = ended
                        ? 'Expired'
                        : (isTrial
                              ? 'Trial Active ($daysLeft days left)'
                              : 'Active ($daysLeft days left)');

                    return RefreshIndicator(
                      onRefresh: () async =>
                          ref.invalidate(subscriptionStatusProvider),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 800),
                          child: ListView(
                            padding: EdgeInsets.symmetric(
                              horizontal: hPadding,
                              vertical: 24,
                            ),
                            children: [
                              Card(
                                elevation: 0,
                                color: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: BorderSide(color: Colors.grey.shade200),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            planName,
                                            style: const TextStyle(
                                              fontSize: 24,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF1F2E27),
                                            ),
                                          ),
                                          Container(
                                            padding:
                                                const EdgeInsets.symmetric(
                                              horizontal: 12,
                                              vertical: 6,
                                            ),
                                            decoration: BoxDecoration(
                                              color: statusColor.withValues(
                                                alpha: 0.1,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(16),
                                            ),
                                            child: Text(
                                              statusText,
                                              style: TextStyle(
                                                color: statusColor,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 24),
                                      _buildInfoRow(
                                        'Billing Cycle',
                                        billingCycle.toString().toUpperCase(),
                                      ),
                                      const Divider(height: 32),
                                      _buildInfoRow(
                                        'Rate Per Student',
                                        '₹${sub['perStudentRate']} / cycle',
                                      ),
                                      const Divider(height: 32),
                                      if (isTrial && trialEndsAt != null)
                                        _buildInfoRow(
                                          'Trial Ends On',
                                          DateFormat(
                                            'MMM dd, yyyy',
                                          ).format(trialEndsAt),
                                        ),
                                      if (!isTrial && nextBillingDate != null)
                                        _buildInfoRow(
                                          'Next Billing Date',
                                          DateFormat(
                                            'MMM dd, yyyy',
                                          ).format(nextBillingDate),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 32),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: CustomButton(
                                  text: 'Upgrade / Downgrade Plan',
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          const BrowsePlansScreen(),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                height: 52,
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    final authState = ref.read(authProvider);
                                    final tenantName =
                                        authState.instituteName ??
                                            'My Institute';
                                    final dash =
                                        ref.read(dashboardProvider).value;
                                    final activeCount =
                                        (dash?['overview']?['totalStudents']
                                                as num?)
                                            ?.toInt() ??
                                        0;
                                    // Use actual paid amount: prefer transaction's lastPaymentAmount, then sub['amount'], then currentCycleAmount
                                    final paidAmount =
                                        sub['lastPaymentAmount'] ??
                                            sub['amount'] ??
                                            sub['currentCycleAmount'] ??
                                            (activeCount > 0
                                                ? (activeCount *
                                                    ((sub['perStudentRate'] ??
                                                            10)
                                                        as num))
                                                : 499);
                                    final lastPaidStr =
                                        sub['lastPaidAt']?.toString();
                                    final paidOnDate = lastPaidStr != null
                                        ? DateTime.tryParse(lastPaidStr)
                                        : (nextBillingDate != null
                                            ? nextBillingDate.subtract(
                                                const Duration(days: 30))
                                            : DateTime.now());

                                    ReceiptService.downloadSubscriptionInvoice(
                                      context: context,
                                      instituteName: tenantName,
                                      planName: planName,
                                      billingCycle: billingCycle.toString(),
                                      amount: paidAmount,
                                      paymentId: sub['lastPaymentId']
                                              ?.toString() ??
                                          'PAY-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}',
                                      orderId: sub['lastOrderId']?.toString(),
                                      paidOn: paidOnDate,
                                      nextBillingDate: nextBillingDate,
                                      studentCount: (sub['studentCountSnapshot']
                                                  as num?)
                                              ?.toInt() ??
                                          activeCount,
                                    );
                                  },
                                  icon: const Icon(
                                    Icons.receipt_long_outlined,
                                    size: 20,
                                  ),
                                  label: const Text(
                                    'Download Tax Invoice / Receipt',
                                    style:
                                        TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF2E6656),
                                    side: const BorderSide(
                                      color: Color(0xFF2E6656),
                                      width: 1.2,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
        ),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
            color: Color(0xFF1F2E27),
          ),
        ),
      ],
    );
  }
}
