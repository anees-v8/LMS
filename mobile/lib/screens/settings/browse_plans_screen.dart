import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/payment_providers.dart';
import '../../services/api_service.dart';
import 'plan_change_screen.dart';

/// Human-readable labels for the backend's feature-key strings
/// (plan_catalog.features), so the comparison list reads naturally.
const Map<String, String> _featureLabels = {
  'student_management': 'Student Management',
  'batch_management': 'Batch Management',
  'digital_attendance': 'Digital Attendance',
  'fee_management': 'Fee Management',
  'video_library': 'Video Library',
  'whatsapp_reminders': 'WhatsApp Reminders',
  'email_notifications': 'Automated Email Notifications',
  'live_classes': 'Live Classes (Google Meet)',
  'performance_reports': 'Performance Reports',
  'online_tests': 'Online Tests',
  'doubt_solving': 'Doubt Solving',
};

class BrowsePlansScreen extends ConsumerStatefulWidget {
  const BrowsePlansScreen({super.key});

  @override
  ConsumerState<BrowsePlansScreen> createState() => _BrowsePlansScreenState();
}

enum _Cycle { monthly, quarterly, yearly }

class _BrowsePlansScreenState extends ConsumerState<BrowsePlansScreen> {
  _Cycle _cycle = _Cycle.monthly;

  @override
  Widget build(BuildContext context) {
    final plansAsync = ref.watch(publicPlansProvider);
    final subAsync = ref.watch(subscriptionStatusProvider);
    final currentPlanId = subAsync.value?['planCatalogId'] as int?;

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
                    'Browse Plans',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Compare, subscribe, upgrade or downgrade',
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
                child: plansAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(
                    child: Text(
                      friendlyErrorMessage(err),
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ),
                  data: (plans) {
                    if (plans.isEmpty) {
                      return const Center(
                        child: Text(
                          'No plans available right now.',
                          style: TextStyle(color: Colors.grey),
                        ),
                      );
                    }
                    return RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(publicPlansProvider);
                        ref.invalidate(subscriptionStatusProvider);
                      },
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _buildCycleToggle(),
                          const SizedBox(height: 16),
                          ...plans.map(
                            (p) => _PlanCard(
                              plan: p as Map<String, dynamic>,
                              cycle: _cycle,
                              isCurrent: currentPlanId != null &&
                                  currentPlanId == (p['id'] as int?),
                              onSelect: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => PlanChangeScreen(
                                      planCatalogId: p['id'] as int,
                                      planName: p['name']?.toString() ?? 'Plan',
                                      billingCycle: _cycleValue(_cycle),
                                    ),
                                  ),
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
    );
  }

  String _cycleValue(_Cycle c) {
    switch (c) {
      case _Cycle.monthly:
        return 'monthly';
      case _Cycle.quarterly:
        return 'quarterly';
      case _Cycle.yearly:
        return 'yearly';
    }
  }

  Widget _buildCycleToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: _Cycle.values.map((c) {
          final selected = c == _cycle;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _cycle = c),
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
                child: Text(
                  _cycleLabel(c),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: selected
                        ? const Color(0xFF1F2E27)
                        : Colors.grey.shade600,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _cycleLabel(_Cycle c) {
    switch (c) {
      case _Cycle.monthly:
        return 'Monthly';
      case _Cycle.quarterly:
        return 'Quarterly';
      case _Cycle.yearly:
        return 'Yearly';
    }
  }
}

class _PlanCard extends StatelessWidget {
  final Map<String, dynamic> plan;
  final _Cycle cycle;
  final bool isCurrent;
  final VoidCallback onSelect;
  const _PlanCard({
    required this.plan,
    required this.cycle,
    required this.isCurrent,
    required this.onSelect,
  });

  int get _price {
    switch (cycle) {
      case _Cycle.monthly:
        return plan['priceMonthly'] as int? ?? 0;
      case _Cycle.quarterly:
        return plan['priceQuarterly'] as int? ?? 0;
      case _Cycle.yearly:
        return plan['priceYearly'] as int? ?? 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = plan['name']?.toString() ?? 'Plan';
    final tagline = plan['tagline']?.toString();
    final features = (plan['features'] as List<dynamic>? ?? []).cast<String>();
    final isPopular = name.toLowerCase() == 'pro';
    final flatTeacherLimit = plan['flatTeacherLimit'] as int?;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrent
              ? const Color(0xFF2E6656)
              : isPopular
              ? const Color(0xFFA87D26)
              : Colors.grey.shade200,
          width: isCurrent || isPopular ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2E27),
                      ),
                    ),
                    if (isPopular && !isCurrent) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFA87D26).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Most Popular',
                          style: TextStyle(
                            color: Color(0xFFA87D26),
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (isCurrent)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2E6656).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'Current Plan',
                      style: TextStyle(
                        color: Color(0xFF2E6656),
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
              ],
            ),
            if (tagline != null && tagline.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                tagline,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '₹$_price',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  '/ student / month',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              ],
            ),
            if (flatTeacherLimit != null) ...[
              const SizedBox(height: 4),
              Text(
                'Up to $flatTeacherLimit teacher${flatTeacherLimit == 1 ? '' : 's'}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
              ),
            ],
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),
            ...features.map(
              (key) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: Color(0xFF2E6656),
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _featureLabels[key] ?? key,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                onPressed: isCurrent ? null : onSelect,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E6656),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(isCurrent ? 'Current Plan' : 'Select Plan'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
