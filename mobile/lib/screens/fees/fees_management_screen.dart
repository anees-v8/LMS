import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../../widgets/fee_analytic_card.dart';
import '../../widgets/record_payment_bottom_sheet.dart';
import '../../widgets/feature_locked_view.dart';
import 'student_fee_details_screen.dart';
import '../settings/payment_settings_screen.dart';
import '../../widgets/unified_app_header.dart';

// ─── Main Screen ─────────────────────────────────────────────────────────────

class FeesManagementScreen extends ConsumerStatefulWidget {
  const FeesManagementScreen({super.key});

  @override
  ConsumerState<FeesManagementScreen> createState() =>
      _FeesManagementScreenState();
}

class _FeesManagementScreenState extends ConsumerState<FeesManagementScreen> {
  String _selectedStatus = 'all';
  String _searchQuery = '';

  void _openAction() {
    showRecordPaymentBottomSheet(context, ref);
  }

  @override
  Widget build(BuildContext context) {
    final feesAsync = ref.watch(feesProvider(_selectedStatus));
    final analyticsAsync = ref.watch(feeAnalyticsProvider);

    final authState = ref.watch(authProvider);
    final instituteName = authState.instituteName ?? 'Institute';

    final parts = instituteName.trim().split(' ');
    final initials = parts.length > 1
        ? '${parts[0][0]}${parts[1][0]}'.toUpperCase()
        : (instituteName.isNotEmpty ? instituteName[0].toUpperCase() : 'A');

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      resizeToAvoidBottomInset: false,
      appBar: UnifiedAppHeader(
        title: 'Fees Management',
        subtitle: 'Balances & Collections',
        initials: initials,
        showQrScanner: false,
        showNotifications: false,
        trailingActions: [
          Tooltip(
            message: 'Payment Settings',
            child: InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const PaymentSettingsScreen(),
                ),
              ),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFFE2E8F0),
                    width: 1.2,
                  ),
                ),
                child: const Icon(
                  Icons.settings_outlined,
                  color: Color(0xFF1E293B),
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
      body: _buildBalancesTab(feesAsync, analyticsAsync),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        onPressed: _openAction,
        icon: const Icon(Icons.add),
        label: const Text('Record Payment'),
      ),
    );
  }

  Widget _buildBalancesTab(
    AsyncValue<List<dynamic>> feesAsync,
    AsyncValue<Map<String, dynamic>> analyticsAsync,
  ) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isLandscape = screenWidth >= 900;
    final isTablet = screenWidth >= 650;
    final hPadding = screenWidth >= 900 ? 36.0 : (screenWidth >= 650 ? 32.0 : 16.0);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              // Analytics Row
              analyticsAsync.when(
                loading: () => const SizedBox(
                  height: 110,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (err, stack) => SizedBox(
                  height: 110,
                  child: Center(child: Text(friendlyErrorMessage(err))),
                ),
                data: (data) {
                  final totalCollected = data['totalCollected'] ?? 0;
                  final totalCollectedGrowth =
                      data['totalCollectedGrowth'] ?? 0;
                  final totalPending = data['totalPending'] ?? 0;
                  final pendingStudents = data['pendingStudents'] ?? 0;
                  final overdue = data['overdue'] ?? 0;
                  final overdueStudents = data['overdueStudents'] ?? 0;
                  final todayCollection = data['todayCollection'] ?? 0;
                  final todayPaymentsCount = data['todayPaymentsCount'] ?? 0;

                  final card1 = FeeAnalyticCard(
                    title: 'Total Collected',
                    value: '${Constants.currencySymbol}$totalCollected',
                    icon: Icons.account_balance_wallet_outlined,
                    iconColor: const Color(0xFF2E6656),
                    iconBgColor: const Color(
                      0xFF2E6656,
                    ).withValues(alpha: 0.1),
                    subtitle:
                        'This Month ${totalCollectedGrowth >= 0 ? '↑' : '↓'} ${totalCollectedGrowth.abs()}%',
                    subtitleColor: totalCollectedGrowth >= 0
                        ? const Color(0xFF2E6656)
                        : const Color(0xFFA93327),
                    width: isTablet ? null : 220,
                    margin: isTablet ? EdgeInsets.zero : const EdgeInsets.only(right: 16),
                  );

                  final card2 = FeeAnalyticCard(
                    title: 'Total Pending',
                    value: '${Constants.currencySymbol}$totalPending',
                    icon: Icons.access_time,
                    iconColor: const Color(0xFFA87D26),
                    iconBgColor: const Color(
                      0xFFA87D26,
                    ).withValues(alpha: 0.1),
                    subtitle: '$pendingStudents Students',
                    subtitleColor: const Color(0xFFA87D26),
                    width: isTablet ? null : 220,
                    margin: isTablet ? EdgeInsets.zero : const EdgeInsets.only(right: 16),
                  );

                  final card3 = FeeAnalyticCard(
                    title: 'Overdue',
                    value: '${Constants.currencySymbol}$overdue',
                    icon: Icons.warning_amber_rounded,
                    iconColor: const Color(0xFFA93327),
                    iconBgColor: const Color(
                      0xFFA93327,
                    ).withValues(alpha: 0.1),
                    subtitle: '$overdueStudents Students',
                    subtitleColor: const Color(0xFFA93327),
                    width: isTablet ? null : 220,
                    margin: isTablet ? EdgeInsets.zero : const EdgeInsets.only(right: 16),
                  );

                  final card4 = FeeAnalyticCard(
                    title: 'Today\'s Collection',
                    value: '${Constants.currencySymbol}$todayCollection',
                    icon: Icons.calendar_today_outlined,
                    iconColor: const Color(0xFF2563EB),
                    iconBgColor: const Color(
                      0xFF2563EB,
                    ).withValues(alpha: 0.1),
                    subtitle: '$todayPaymentsCount Payments',
                    subtitleColor: const Color(0xFF2563EB),
                    width: isTablet ? null : 220,
                    margin: isTablet ? EdgeInsets.zero : const EdgeInsets.only(right: 16),
                  );

                  if (isTablet) {
                    return Padding(
                      padding: EdgeInsets.symmetric(horizontal: hPadding),
                      child: Row(
                        children: [
                          Expanded(child: card1),
                          const SizedBox(width: 12),
                          Expanded(child: card2),
                          const SizedBox(width: 12),
                          Expanded(child: card3),
                          const SizedBox(width: 12),
                          Expanded(child: card4),
                        ],
                      ),
                    );
                  }

                  return SizedBox(
                    height: 110,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: EdgeInsets.symmetric(horizontal: hPadding),
                      children: [card1, card2, card3, card4],
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              // Search & Filters
              Padding(
                padding: EdgeInsets.symmetric(horizontal: hPadding),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        onChanged: (v) => setState(
                          () => _searchQuery = v.trim().toLowerCase(),
                        ),
                        decoration: InputDecoration(
                          hintText: 'Search by student name...',
                          hintStyle: TextStyle(
                            color: const Color(
                              0xFF1F2E27,
                            ).withValues(alpha: 0.5),
                          ),
                          prefixIcon: const Icon(
                            Icons.search,
                            color: Color(0xFF2E6656),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Choice Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: hPadding),
                child: Row(
                  children: [
                    _buildChip('All', 'all'),
                    const SizedBox(width: 8),
                    _buildChip('Overdue', 'overdue'),
                    const SizedBox(width: 8),
                    _buildChip('Pending', 'pending'),
                    const SizedBox(width: 8),
                    _buildChip('Paid', 'paid'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
        // List
        feesAsync.when(
          loading: () => const SliverFillRemaining(
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (err, stack) => SliverFillRemaining(
            child: Center(child: Text(friendlyErrorMessage(err))),
          ),
          data: (fees) {
            final filteredFees = fees.where((f) {
              final name = (f['name'] ?? '').toString().toLowerCase();
              return name.contains(_searchQuery);
            }).toList();

            if (filteredFees.isEmpty) return _buildEmptyState();

            if (isLandscape) {
              return SliverPadding(
                padding: EdgeInsets.fromLTRB(hPadding, 0, hPadding, 160),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 12,
                    mainAxisExtent: 76,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    return _buildFeeItem(
                      filteredFees[index] as Map<String, dynamic>,
                      isGrid: true,
                    );
                  }, childCount: filteredFees.length),
                ),
              );
            }

            return SliverPadding(
              padding: EdgeInsets.fromLTRB(hPadding, 0, hPadding, 160),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  return _buildFeeItem(
                    filteredFees[index] as Map<String, dynamic>,
                    isGrid: false,
                  );
                }, childCount: filteredFees.length),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildChip(String label, String statusValue) {
    final isSelected = _selectedStatus == statusValue;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedStatus = statusValue;
          });
        }
      },
      selectedColor: const Color(0xFF2E6656).withValues(alpha: 0.1),
      labelStyle: TextStyle(
        color: isSelected ? const Color(0xFF2E6656) : const Color(0xFF1F2E27),
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      side: BorderSide(
        color: isSelected ? const Color(0xFF2E6656) : const Color(0xFFDDE2E0),
      ),
    );
  }

  Widget _buildEmptyState() {
    return const SliverFillRemaining(
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: Color(0xFF2E6656),
            ),
            SizedBox(height: 16),
            Text(
              'No fee records yet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1F2E27),
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Record a payment or create a fee structure to get started.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF2E6656)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeeItem(Map<String, dynamic> fee, {bool isGrid = false}) {
    final pending = (fee['pending'] is num) ? fee['pending'] as num : 0;
    final isPaid = pending <= 0;
    final statusColor = isPaid
        ? const Color(0xFF2E6656)
        : const Color(0xFFA93327);

    return Container(
      margin: isGrid ? EdgeInsets.zero : const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (ctx) => StudentFeeDetailsScreen(
                  student: {
                    'id': fee['studentId'],
                    'fullName': fee['name'] ?? 'Unknown',
                  },
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    isPaid ? Icons.check_circle_outline : Icons.timelapse,
                    color: statusColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        fee['name'] ?? 'Unknown',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2E27),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Total ${Constants.currencySymbol}${fee['total'] ?? 0}'
                        ' • Paid ${Constants.currencySymbol}${fee['paid'] ?? 0}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF2E6656),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${Constants.currencySymbol}$pending',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: statusColor,
                      ),
                    ),
                    Text(
                      isPaid ? 'Paid' : 'Pending',
                      style: TextStyle(color: statusColor, fontSize: 12),
                    ),
                  ],
                ),
                if (!isPaid)
                  IconButton(
                    tooltip: 'Send WhatsApp reminder',
                    icon: const Icon(
                      Icons.notifications_active_outlined,
                      color: Color(0xFF2E6656),
                    ),
                    onPressed: () => _sendReminder(fee),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _sendReminder(Map<String, dynamic> fee) async {
    final hasAccess = ref.read(
      authProvider.select((state) => state.hasFeature('whatsapp_reminders')),
    );
    if (!hasAccess) {
      showUpgradeRequiredSheet(context, featureLabel: 'WhatsApp Reminders');
      return;
    }
    try {
      final result = await sendFeeReminder(
        ref.read(apiServiceProvider),
        fee['studentId'] as int,
      );
      final waUrl = result['waUrl']?.toString() ?? '';

      if (waUrl.isNotEmpty) {
        final uri = Uri.parse(waUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Could not launch WhatsApp. Copying link instead.',
                ),
              ),
            );
            Clipboard.setData(ClipboardData(text: waUrl));
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(e))));
      }
    }
  }
}
