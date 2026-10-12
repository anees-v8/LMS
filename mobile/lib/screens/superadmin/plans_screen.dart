import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/superadmin_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';

/// The feature keys gated by `featureGuard` — must match backend's
/// `FeatureKey` union exactly (src/lib/middleware/featureGuard.ts).
const List<String> kFeatureKeys = [
  'student_management',
  'batch_management',
  'digital_attendance',
  'fee_management',
  'video_library',
  'whatsapp_reminders',
  'email_notifications',
  'live_classes',
  'performance_reports',
  'online_tests',
  'doubt_solving',
  'teacher_accounts',
];

String _featureLabel(String key) =>
    key.split('_').map((w) => w[0].toUpperCase() + w.substring(1)).join(' ');

/// Super Admin's "Plans" tab — pricing catalog CRUD.
/// `PlanCatalogItem`: {id, name, tagline, priceMonthly, priceQuarterly,
/// priceYearly, features[], isActive, displayOrder}.
class PlansScreen extends ConsumerWidget {
  const PlansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plansAsync = ref.watch(plansProvider);

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
                    'Plan Catalog',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage subscription plans and pricing',
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
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (plans) {
                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(plansProvider),
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 160),
                        itemCount: plans.length + 1,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            return const Padding(
                              padding: EdgeInsets.only(bottom: 12),
                              child: _DowngradePenaltyCard(),
                            );
                          }
                          if (plans.isEmpty) return const SizedBox.shrink();
                          final plan = plans[index - 1] as Map<String, dynamic>;
                          final isActive = plan['isActive'] == true;
                          final features =
                              (plan['features'] as List?)?.cast<String>() ?? [];

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          plan['name'] ?? '',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color:
                                              (isActive
                                                      ? Colors.green
                                                      : Colors.grey)
                                                  .withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: Text(
                                          isActive ? 'Active' : 'Inactive',
                                          style: TextStyle(
                                            color: isActive
                                                ? Colors.green
                                                : Colors.grey,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (plan['tagline'] != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      plan['tagline'],
                                      style: TextStyle(
                                        color: Colors.grey.shade700,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 8),
                                  Text(
                                    '₹${plan['priceMonthly']}/mo  •  ₹${plan['priceQuarterly']}/qtr  •  ₹${plan['priceYearly']}/yr  (per student)',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Up to ${plan['flatTeacherLimit']} teacher${plan['flatTeacherLimit'] == 1 ? '' : 's'}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: Colors.grey.shade600,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: features
                                        .map(
                                          (f) => Chip(
                                            label: Text(
                                              _featureLabel(f),
                                              style: const TextStyle(
                                                fontSize: 11,
                                              ),
                                            ),
                                            materialTapTargetSize:
                                                MaterialTapTargetSize
                                                    .shrinkWrap,
                                            visualDensity:
                                                VisualDensity.compact,
                                          ),
                                        )
                                        .toList(),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      TextButton.icon(
                                        onPressed: () => showModalBottomSheet(
                                          context: context,
                                          isScrollControlled: true,
                                          backgroundColor: Colors.transparent,
                                          builder: (_) => _PlanFormBottomSheet(
                                            existing: plan,
                                          ),
                                        ),
                                        icon: const Icon(Icons.edit, size: 18),
                                        label: const Text('Edit'),
                                      ),
                                      if (isActive)
                                        TextButton.icon(
                                          onPressed: () => _confirmDeactivate(
                                            context,
                                            ref,
                                            plan,
                                          ),
                                          icon: const Icon(
                                            Icons.block,
                                            size: 18,
                                            color: Colors.red,
                                          ),
                                          label: const Text(
                                            'Deactivate',
                                            style: TextStyle(color: Colors.red),
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
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
          builder: (_) => const _PlanFormBottomSheet(),
        ),
        backgroundColor: const Color(0xFF1F2E27),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Plan', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Future<void> _confirmDeactivate(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> plan,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Deactivate plan?'),
        content: Text(
          '${plan['name']} will no longer be offered to new tenants.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Deactivate',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await deactivatePlan(ref.read(apiServiceProvider), plan['id'] as int);
      ref.invalidate(plansProvider);
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
}

class _PlanFormBottomSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic>? existing;
  const _PlanFormBottomSheet({this.existing});

  @override
  ConsumerState<_PlanFormBottomSheet> createState() =>
      _PlanFormBottomSheetState();
}

class _PlanFormBottomSheetState extends ConsumerState<_PlanFormBottomSheet> {
  late final TextEditingController _name;
  late final TextEditingController _tagline;
  late final TextEditingController _priceMonthly;
  late final TextEditingController _priceQuarterly;
  late final TextEditingController _priceYearly;
  late final TextEditingController _flatTeacherLimit;
  late final TextEditingController _displayOrder;
  late final Set<String> _selectedFeatures;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?['name']?.toString() ?? '');
    _tagline = TextEditingController(text: e?['tagline']?.toString() ?? '');
    _priceMonthly = TextEditingController(
      text: e?['priceMonthly']?.toString() ?? '',
    );
    _priceQuarterly = TextEditingController(
      text: e?['priceQuarterly']?.toString() ?? '',
    );
    _priceYearly = TextEditingController(
      text: e?['priceYearly']?.toString() ?? '',
    );
    _flatTeacherLimit = TextEditingController(
      text: e?['flatTeacherLimit']?.toString() ?? '',
    );
    _displayOrder = TextEditingController(
      text: e?['displayOrder']?.toString() ?? '',
    );
    _selectedFeatures =
        ((e?['features'] as List?)?.cast<String>() ?? <String>[]).toSet();
  }

  @override
  void dispose() {
    _name.dispose();
    _tagline.dispose();
    _priceMonthly.dispose();
    _priceQuarterly.dispose();
    _priceYearly.dispose();
    _flatTeacherLimit.dispose();
    _displayOrder.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final monthly = int.tryParse(_priceMonthly.text.trim());
    final quarterly = int.tryParse(_priceQuarterly.text.trim());
    final yearly = int.tryParse(_priceYearly.text.trim());
    final flatTeacherLimit = int.tryParse(_flatTeacherLimit.text.trim());

    if (_name.text.trim().isEmpty ||
        monthly == null ||
        quarterly == null ||
        yearly == null ||
        flatTeacherLimit == null ||
        _selectedFeatures.isEmpty) {
      setState(
        () => _error =
            'Name, all prices, the teacher limit, and at least one feature are required.',
      );
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final displayOrder = int.tryParse(_displayOrder.text.trim());
      if (_isEdit) {
        await updatePlan(
          api,
          widget.existing!['id'] as int,
          tagline: _tagline.text.trim(),
          priceMonthly: monthly,
          priceQuarterly: quarterly,
          priceYearly: yearly,
          flatTeacherLimit: flatTeacherLimit,
          features: _selectedFeatures.toList(),
          displayOrder: displayOrder,
        );
      } else {
        await createPlan(
          api,
          name: _name.text.trim(),
          priceMonthly: monthly,
          priceQuarterly: quarterly,
          priceYearly: yearly,
          flatTeacherLimit: flatTeacherLimit,
          features: _selectedFeatures.toList(),
          tagline: _tagline.text.trim(),
          displayOrder: displayOrder,
        );
      }
      ref.invalidate(plansProvider);
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
                  Text(
                    _isEdit ? 'Edit Plan' : 'Add Plan',
                    style: const TextStyle(
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
              if (!_isEdit) ...[
                CustomTextField(
                  label: 'Plan Name',
                  hint: 'e.g. Pro',
                  controller: _name,
                  prefixIcon: Icons.card_membership_outlined,
                ),
                const SizedBox(height: 16),
              ],
              CustomTextField(
                label: 'Tagline (optional)',
                hint: 'Short one-liner',
                controller: _tagline,
                prefixIcon: Icons.short_text,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      label: 'Monthly ₹',
                      hint: '999',
                      controller: _priceMonthly,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CustomTextField(
                      label: 'Quarterly ₹',
                      hint: '2699',
                      controller: _priceQuarterly,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Yearly ₹',
                hint: '9999',
                controller: _priceYearly,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Teacher Limit',
                hint: 'e.g. 5',
                controller: _flatTeacherLimit,
                prefixIcon: Icons.badge_outlined,
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Display Order (optional)',
                hint: '0',
                controller: _displayOrder,
                prefixIcon: Icons.sort,
              ),
              const SizedBox(height: 20),
              const Text(
                'Features',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2E27),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: kFeatureKeys.map((key) {
                  final selected = _selectedFeatures.contains(key);
                  return FilterChip(
                    label: Text(
                      _featureLabel(key),
                      style: const TextStyle(fontSize: 12),
                    ),
                    selected: selected,
                    onSelected: (v) => setState(() {
                      if (v) {
                        _selectedFeatures.add(key);
                      } else {
                        _selectedFeatures.remove(key);
                      }
                    }),
                    selectedColor: const Color(0xFF2E6656),
                    backgroundColor: Colors.white,
                    checkmarkColor: Colors.white,
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : const Color(0xFF1F2E27),
                      fontWeight: FontWeight.w600,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: selected
                            ? const Color(0xFF2E6656)
                            : Colors.grey.shade300,
                      ),
                    ),
                  );
                }).toList(),
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
                        text: _isEdit ? 'Save Changes' : 'Add Plan',
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

/// Global, platform-wide fixed penalty charged to a tenant only when they
/// downgrade plan/cycle mid-cycle (never on upgrade) — set here once for
/// all tenants rather than per-tenant, since there's exactly one value.
class _DowngradePenaltyCard extends ConsumerStatefulWidget {
  const _DowngradePenaltyCard();

  @override
  ConsumerState<_DowngradePenaltyCard> createState() =>
      _DowngradePenaltyCardState();
}

class _DowngradePenaltyCardState extends ConsumerState<_DowngradePenaltyCard> {
  final _controller = TextEditingController();
  bool _saving = false;
  bool _initialized = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = int.tryParse(_controller.text.trim());
    if (amount == null || amount < 0) return;
    setState(() => _saving = true);
    try {
      await updateDowngradePenaltyAmount(ref.read(apiServiceProvider), amount);
      ref.invalidate(platformSettingsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Downgrade penalty updated.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyErrorMessage(e)),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(platformSettingsProvider);
    return settingsAsync.when(
      loading: () => const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: LinearProgressIndicator(),
        ),
      ),
      error: (err, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(friendlyErrorMessage(err)),
        ),
      ),
      data: (settings) {
        if (!_initialized) {
          _controller.text = '${settings['downgradePenaltyAmount'] ?? 0}';
          _initialized = true;
        }
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Downgrade Penalty',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Fixed amount charged when a tenant downgrades plan or '
                  'billing cycle mid-cycle. Never charged on upgrade.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: CustomTextField(
                        label: 'Amount (₹)',
                        hint: 'e.g. 500',
                        controller: _controller,
                        keyboardType: TextInputType.number,
                        prefixIcon: Icons.currency_rupee,
                      ),
                    ),
                    const SizedBox(width: 12),
                    _saving
                        ? const Padding(
                            padding: EdgeInsets.only(top: 20),
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        : Padding(
                            padding: const EdgeInsets.only(top: 20),
                            child: TextButton(
                              onPressed: _save,
                              child: const Text('Save'),
                            ),
                          ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
