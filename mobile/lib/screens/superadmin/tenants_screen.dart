import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/superadmin_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_dropdown.dart';
import '../../widgets/analytics_top_card.dart';
import '../../theme/app_colors.dart';
import 'tenant_details_screen.dart';

/// Super Admin's "Tenants" tab. List fields match `TenantListItem`:
/// {id, name, slug, city, isActive, status, trialEndsAt, nextBillingDate, studentCount}.
class TenantsScreen extends ConsumerStatefulWidget {
  final String? initialFilter;
  const TenantsScreen({super.key, this.initialFilter});

  @override
  ConsumerState<TenantsScreen> createState() => _TenantsScreenState();
}

class _TenantsScreenState extends ConsumerState<TenantsScreen> {
  late String _selectedFilter;

  @override
  void initState() {
    super.initState();
    _selectedFilter = widget.initialFilter ?? 'All';
  }

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);

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
                    'Tenants',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage all subscribed institutes',
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
                child: tenantsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (tenants) {
                    final filteredTenants = tenants.where((t) {
                      if (_selectedFilter == 'All') return true;
                      return t['status']?.toString() == _selectedFilter;
                    }).toList();

                    final int totalTenants = tenants.length;
                    final int activeCount = tenants
                        .where((t) => t['status'] == 'active')
                        .length;
                    final int trialCount = tenants
                        .where((t) => t['status'] == 'trial')
                        .length;
                    final int suspendedCount = tenants
                        .where(
                          (t) =>
                              t['status'] == 'suspended' ||
                              t['status'] == 'past_due',
                        )
                        .length;

                    final String activePercent = totalTenants == 0
                        ? '0%'
                        : '${((activeCount / totalTenants) * 100).toStringAsFixed(0)}%';
                    final String trialPercent = totalTenants == 0
                        ? '0%'
                        : '${((trialCount / totalTenants) * 100).toStringAsFixed(0)}%';
                    final String suspendedPercent = totalTenants == 0
                        ? '0%'
                        : '${((suspendedCount / totalTenants) * 100).toStringAsFixed(0)}%';

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 155,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            children: [
                              AnalyticsTopCard(
                                title: 'Total Tenants',
                                value: totalTenants.toString(),
                                subtitle: 'All Institutes',
                                icon: Icons.business,
                                bgColor: const Color(
                                  0xFF1F2E27,
                                ).withValues(alpha: 0.1),
                                iconColor: const Color(0xFF1F2E27),
                                subtitleColor: Colors.grey.shade600,
                                subtitleIcon: null,
                              ),
                              AnalyticsTopCard(
                                title: 'Active',
                                value: activeCount.toString(),
                                subtitle: '$activePercent of total',
                                icon: Icons.check_circle,
                                bgColor: Colors.green.withValues(alpha: 0.1),
                                iconColor: Colors.green,
                                subtitleColor: Colors.green,
                                subtitleIcon: null,
                              ),
                              AnalyticsTopCard(
                                title: 'Trial',
                                value: trialCount.toString(),
                                subtitle: '$trialPercent of total',
                                icon: Icons.hourglass_top,
                                bgColor: Colors.orange.withValues(alpha: 0.1),
                                iconColor: Colors.orange,
                                subtitleColor: Colors.orange,
                                subtitleIcon: null,
                              ),
                              AnalyticsTopCard(
                                title: 'Suspended',
                                value: suspendedCount.toString(),
                                subtitle: '$suspendedPercent of total',
                                icon: Icons.pause_circle,
                                bgColor: Colors.red.withValues(alpha: 0.1),
                                iconColor: Colors.red,
                                subtitleColor: Colors.red,
                                subtitleIcon: null,
                              ),
                            ],
                          ),
                        ),
                        SizedBox(
                          height: 60,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            children:
                                [
                                  'All',
                                  'active',
                                  'trial',
                                  'suspended',
                                  'past_due',
                                ].map((status) {
                                  final isSelected = _selectedFilter == status;
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 8.0),
                                    child: ChoiceChip(
                                      label: Text(
                                        status == 'All'
                                            ? 'ALL'
                                            : status.toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isSelected
                                              ? Colors.white
                                              : const Color(0xFF1F2E27),
                                        ),
                                      ),
                                      showCheckmark: false,
                                      selected: isSelected,
                                      selectedColor: const Color(0xFF2E6656),
                                      backgroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(20),
                                        side: BorderSide(
                                          color: isSelected
                                              ? Colors.transparent
                                              : Colors.grey.shade300,
                                        ),
                                      ),
                                      onSelected: (selected) {
                                        if (selected)
                                          setState(
                                            () => _selectedFilter = status,
                                          );
                                      },
                                    ),
                                  );
                                }).toList(),
                          ),
                        ),
                        Expanded(
                          child: filteredTenants.isEmpty
                              ? const Center(
                                  child: Text('No institutes found.'),
                                )
                              : RefreshIndicator(
                                  onRefresh: () async =>
                                      ref.invalidate(tenantsProvider),
                                  child: ListView.builder(
                                    padding: const EdgeInsets.fromLTRB(
                                      16,
                                      16,
                                      16,
                                      160,
                                    ),
                                    itemCount: filteredTenants.length,
                                    itemBuilder: (context, index) {
                                      final tenant =
                                          filteredTenants[index]
                                              as Map<String, dynamic>;
                                      final isActive =
                                          tenant['isActive'] == true;
                                      final status =
                                          tenant['status']?.toString() ??
                                          'unknown';
                                      final city = tenant['city']?.toString();
                                      final studentCount =
                                          tenant['studentCount']?.toString() ??
                                          '0';

                                      return TenantCard(
                                        tenant: tenant,
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  TenantDetailsScreen(
                                                    tenant: tenant,
                                                  ),
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  ),
                                ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (ctx) => const _AddTenantBottomSheet(),
        ),
        backgroundColor: const Color(0xFF1F2E27),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Tenant', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Future<void> _toggleActive(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> tenant,
    bool value,
  ) async {
    try {
      await setTenantActive(
        ref.read(apiServiceProvider),
        tenant['id'] as int,
        value,
      );
      ref.invalidate(tenantsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyErrorMessage(e)),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _showAssignPlanDialog(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> tenant,
  ) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AssignPlanBottomSheet(
        tenantId: tenant['id'] as int,
        tenantName: tenant['name']?.toString() ?? '',
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'active':
        color = Colors.green;
        break;
      case 'trial':
        color = Colors.orange;
        break;
      case 'past_due':
        color = Colors.red;
        break;
      case 'suspended':
        color = Colors.grey;
        break;
      default:
        color = Colors.blueGrey;
    }
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class TenantCard extends StatelessWidget {
  final Map<String, dynamic> tenant;
  final VoidCallback onTap;

  const TenantCard({super.key, required this.tenant, required this.onTap});

  String _monthStr(int month) {
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
    return months[month - 1];
  }

  Widget _buildStat(IconData icon, String count, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: Colors.grey.shade700),
            const SizedBox(width: 4),
            Text(
              count,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(color: Colors.grey.shade500, fontSize: 10),
        ),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(
      height: 20,
      width: 1,
      color: Colors.grey.shade300,
      margin: const EdgeInsets.symmetric(horizontal: 12),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String name = tenant['name'] ?? 'Unknown';
    final String? city = tenant['city']?.toString();
    final String studentCount = tenant['studentCount']?.toString() ?? '0';
    final String teacherCount = tenant['teacherCount']?.toString() ?? '0';
    final String batchCount = tenant['batchCount']?.toString() ?? '0';
    final String status = tenant['status']?.toString() ?? 'unknown';

    final String? trialEndsAtStr = tenant['trialEndsAt'];
    final String? nextBillingDateStr = tenant['nextBillingDate'];

    DateTime? trialEndsAt = trialEndsAtStr != null
        ? DateTime.tryParse(trialEndsAtStr)
        : null;
    DateTime? nextBillingDate = nextBillingDateStr != null
        ? DateTime.tryParse(nextBillingDateStr)
        : null;
    final now = DateTime.now();

    String statusText = status.toUpperCase();
    Color statusColor = Colors.grey;
    Color statusBgColor = Colors.grey.withValues(alpha: 0.1);

    Widget dateInfoWidget = const SizedBox.shrink();

    if (status == 'trial') {
      statusText = 'TRIAL';
      statusColor = Colors.orange;
      statusBgColor = Colors.orange.withValues(alpha: 0.1);

      if (trialEndsAt != null) {
        final daysLeft = trialEndsAt.difference(now).inDays;
        final dateStr =
            '${trialEndsAt.day} ${_monthStr(trialEndsAt.month)} ${trialEndsAt.year}';
        dateInfoWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${daysLeft > 0 ? daysLeft : 0} Days Left',
              style: TextStyle(
                color: Colors.orange,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Trial ends on\n$dateStr',
              textAlign: TextAlign.right,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 10),
            ),
          ],
        );
      }
    } else if (status == 'active') {
      statusText = 'PREMIUM';
      statusColor = Colors.green;
      statusBgColor = Colors.green.withValues(alpha: 0.1);

      if (nextBillingDate != null) {
        final dateStr =
            '${nextBillingDate.day} ${_monthStr(nextBillingDate.month)} ${nextBillingDate.year}';
        dateInfoWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'Valid till\n$dateStr',
              textAlign: TextAlign.right,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 10),
            ),
          ],
        );
      }
    } else {
      statusText = status == 'past_due' ? 'EXPIRED' : status.toUpperCase();
      statusColor = Colors.red;
      statusBgColor = Colors.red.withValues(alpha: 0.1);

      DateTime? expiredOn = nextBillingDate ?? trialEndsAt;
      if (expiredOn != null) {
        final dateStr =
            '${expiredOn.day} ${_monthStr(expiredOn.month)} ${expiredOn.year}';
        dateInfoWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'Expired on\n$dateStr',
              textAlign: TextAlign.right,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 10),
            ),
          ],
        );
      }
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: const Color(0xFFE8F0ED),
                      child: const Icon(
                        Icons.business,
                        color: Color(0xFF1F2E27),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: Color(0xFF1F2E27),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${city != null && city.isNotEmpty ? '$city, ' : ''}Maharashtra',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _buildStat(
                                Icons.school,
                                studentCount,
                                'Students',
                              ),
                              _buildVerticalDivider(),
                              _buildStat(
                                Icons.person,
                                teacherCount,
                                'Teachers',
                              ),
                              _buildVerticalDivider(),
                              _buildStat(
                                Icons.menu_book,
                                batchCount,
                                'Batches',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          statusText,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  dateInfoWidget,
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddTenantBottomSheet extends ConsumerStatefulWidget {
  const _AddTenantBottomSheet();

  @override
  ConsumerState<_AddTenantBottomSheet> createState() =>
      _AddTenantBottomSheetState();
}

class _AddTenantBottomSheetState extends ConsumerState<_AddTenantBottomSheet> {
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _city = TextEditingController();
  final _contactPhone = TextEditingController();
  final _adminName = TextEditingController();
  final _adminPhone = TextEditingController();
  final _adminPassword = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _slug.dispose();
    _city.dispose();
    _contactPhone.dispose();
    _adminName.dispose();
    _adminPhone.dispose();
    _adminPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty ||
        _slug.text.trim().isEmpty ||
        _adminName.text.trim().isEmpty ||
        _adminPhone.text.trim().isEmpty ||
        _adminPassword.text.isEmpty) {
      setState(
        () =>
            _error = 'Name, slug, admin name, phone and password are required.',
      );
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await registerTenant(
        ref.read(apiServiceProvider),
        name: _name.text.trim(),
        slug: _slug.text.trim(),
        adminName: _adminName.text.trim(),
        adminPhone: _adminPhone.text.trim(),
        adminPassword: _adminPassword.text,
        city: _city.text.trim(),
        contactPhone: _contactPhone.text.trim(),
      );
      ref.invalidate(tenantsProvider);
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
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
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
                  const Text(
                    'Add Institute',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              CustomTextField(
                label: 'Institute Name',
                hint: 'e.g. Bright Future Coaching',
                controller: _name,
                prefixIcon: Icons.business_outlined,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Slug',
                hint: 'lowercase-hyphenated, e.g. bright-future',
                controller: _slug,
                prefixIcon: Icons.link,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'City (optional)',
                hint: 'City',
                controller: _city,
                prefixIcon: Icons.location_city_outlined,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Contact Phone (optional)',
                hint: 'Institute contact phone',
                controller: _contactPhone,
                prefixIcon: Icons.call_outlined,
              ),
              const SizedBox(height: 20),
              const Text(
                'Coaching Admin',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2E27),
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'This person logs in to manage the institute.',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
              const SizedBox(height: 10),
              CustomTextField(
                label: 'Admin Name',
                hint: "Coaching admin's name",
                controller: _adminName,
                prefixIcon: Icons.person_outline,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Admin Phone',
                hint: '10-15 digit login phone',
                controller: _adminPhone,
                prefixIcon: Icons.phone_android_outlined,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Admin Password',
                hint: 'Min 6 characters',
                isPassword: true,
                controller: _adminPassword,
                prefixIcon: Icons.lock_outline,
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
              const SizedBox(height: 32),
              _saving
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: CustomButton(
                        text: 'Add Institute',
                        onPressed: _submit,
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AssignPlanBottomSheet extends ConsumerStatefulWidget {
  final int tenantId;
  final String tenantName;
  const _AssignPlanBottomSheet({
    required this.tenantId,
    required this.tenantName,
  });

  @override
  ConsumerState<_AssignPlanBottomSheet> createState() =>
      _AssignPlanBottomSheetState();
}

class _AssignPlanBottomSheetState
    extends ConsumerState<_AssignPlanBottomSheet> {
  int? _planId;
  String _billingCycle = 'monthly';
  String _billingMode = 'per_student';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_planId == null) {
      setState(() => _error = 'Choose a plan.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await assignPlanToTenant(
        ref.read(apiServiceProvider),
        widget.tenantId,
        planCatalogId: _planId!,
        billingCycle: _billingCycle,
        billingMode: _billingMode,
      );
      ref.invalidate(tenantsProvider);
      ref.invalidate(tenantSubscriptionProvider(widget.tenantId));
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
    final subDetailAsync = ref.watch(
      tenantSubscriptionProvider(widget.tenantId),
    );
    final plansAsync = ref.watch(plansProvider);

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
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
                      widget.tenantName,
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
              const SizedBox(height: 8),
              subDetailAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: LinearProgressIndicator(),
                ),
                error: (err, stack) => Text(
                  friendlyErrorMessage(err),
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                ),
                data: (detail) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Current: ${detail['planName'] ?? 'No plan assigned'} • ${detail['status']} • ₹${detail['amount'] ?? 0}',
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              plansAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (err, stack) => Text(
                  friendlyErrorMessage(err),
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                ),
                data: (plans) {
                  final active = plans
                      .cast<Map<String, dynamic>>()
                      .where((p) => p['isActive'] == true)
                      .toList();
                  return CustomDropdown<int?>(
                    label: 'Plan',
                    hint: 'Choose plan',
                    value: _planId,
                    options: active
                        .map(
                          (p) => DropdownOption<int?>(
                            value: p['id'] as int,
                            label: p['name']?.toString() ?? '',
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _planId = v),
                  );
                },
              ),
              const SizedBox(height: 16),
              const Text(
                'Billing Mode',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2E27),
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Flat bills a fixed monthly amount regardless of student count.',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Per Student'),
                      selected: _billingMode == 'per_student',
                      onSelected: (v) {
                        if (v) setState(() => _billingMode = 'per_student');
                      },
                      selectedColor: const Color(0xFF2E6656),
                      labelStyle: TextStyle(
                        color: _billingMode == 'per_student'
                            ? Colors.white
                            : const Color(0xFF1F2E27),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Flat'),
                      selected: _billingMode == 'flat',
                      onSelected: (v) {
                        if (v) setState(() => _billingMode = 'flat');
                      },
                      selectedColor: const Color(0xFF2E6656),
                      labelStyle: TextStyle(
                        color: _billingMode == 'flat'
                            ? Colors.white
                            : const Color(0xFF1F2E27),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              if (_billingMode == 'per_student') ...[
                const SizedBox(height: 16),
                CustomDropdown<String>(
                  label: 'Billing Cycle',
                  hint: 'Select a billing cycle',
                  value: _billingCycle,
                  options: const [
                    DropdownOption(value: 'monthly', label: 'Monthly'),
                    DropdownOption(value: 'quarterly', label: 'Quarterly'),
                    DropdownOption(value: 'yearly', label: 'Yearly'),
                  ],
                  onChanged: (v) =>
                      setState(() => _billingCycle = v ?? 'monthly'),
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
              const SizedBox(height: 32),
              _saving
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: CustomButton(
                        text: 'Assign Plan',
                        onPressed: _submit,
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
