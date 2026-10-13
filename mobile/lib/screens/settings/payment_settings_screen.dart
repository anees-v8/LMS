import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_textfield.dart';

class PaymentSettingsScreen extends ConsumerStatefulWidget {
  const PaymentSettingsScreen({super.key});

  @override
  ConsumerState<PaymentSettingsScreen> createState() =>
      _PaymentSettingsScreenState();
}

class _PaymentSettingsScreenState extends ConsumerState<PaymentSettingsScreen> {
  final _keyIdController = TextEditingController();
  final _secretController = TextEditingController();

  bool _initialized = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _keyIdController.dispose();
    _secretController.dispose();
    super.dispose();
  }

  void _populateFromData(Map<String, dynamic> data) {
    if (_initialized) return;
    _initialized = true;
    final keyId = data['keyId'] as String? ?? '';
    final secretPlaceholder = data['secretPlaceholder'] as String? ?? '';
    _keyIdController.text = keyId;
    if (secretPlaceholder.isNotEmpty) {
      _secretController.text = secretPlaceholder;
    }
  }

  Future<void> _saveSettings() async {
    final keyId = _keyIdController.text.trim();
    final secret = _secretController.text.trim();

    if (keyId.isEmpty) {
      setState(() => _error = 'Please enter your Razorpay Key ID.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      await updateAdminPaymentSettings(
        api,
        keyId: keyId,
        secret: secret.isNotEmpty ? secret : null,
      );
      ref.invalidate(adminPaymentSettingsProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment gateway credentials saved successfully.'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  Future<void> _disconnect() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect Razorpay?'),
        content: const Text(
          'Students will not be able to pay fees online until you re-enter your Razorpay credentials.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      await updateAdminPaymentSettings(api, keyId: null, secret: null);
      _keyIdController.clear();
      _secretController.clear();
      ref.invalidate(adminPaymentSettingsProvider);

      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment gateway disconnected.'),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(adminPaymentSettingsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2E27),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        title: const Text(
          'Payment Gateway (Razorpay)',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: settingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                const SizedBox(height: 12),
                Text(
                  friendlyErrorMessage(e),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.black87),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.refresh(adminPaymentSettingsProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          _populateFromData(data);
          final isConfigured = data['configured'] as bool? ?? false;

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Status Banner Card ──────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isConfigured
                            ? AppColors.success.withValues(alpha: 0.3)
                            : Colors.grey.shade300,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isConfigured
                                ? AppColors.success.withValues(alpha: 0.1)
                                : Colors.amber.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isConfigured
                                ? Icons.verified_rounded
                                : Icons.warning_amber_rounded,
                            color: isConfigured ? AppColors.success : Colors.amber.shade800,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isConfigured
                                    ? 'Online Gateway Active'
                                    : 'Gateway Not Configured',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: isConfigured
                                      ? AppColors.success
                                      : const Color(0xFF1F2E27),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                isConfigured
                                    ? 'Students can pay fees directly to your Razorpay account.'
                                    : 'Configure Razorpay to enable student online fee payments.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── Instruction Card ─────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2E6656).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFF2E6656).withValues(alpha: 0.15),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.info_outline, size: 18, color: Color(0xFF2E6656)),
                            SizedBox(width: 8),
                            Text(
                              'Direct Bank Deposit (BYOG)',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2E27),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'All payments processed will be credited directly to your bank account via Razorpay. We do not hold or deduct any commission from your student fees.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade800,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── Form Inputs ──────────────────────────────────────────────
                  CustomTextField(
                    label: 'Razorpay Key ID',
                    hint: 'rzp_live_... or rzp_test_...',
                    controller: _keyIdController,
                    prefixIcon: Icons.vpn_key_outlined,
                  ),

                  const SizedBox(height: 16),

                  CustomTextField(
                    label: 'Razorpay Key Secret',
                    hint: isConfigured ? 'Leave unchanged or enter new secret' : 'Enter Key Secret',
                    isPassword: true,
                    controller: _secretController,
                    prefixIcon: Icons.lock_outline,
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      _error!,
                      style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],

                  const SizedBox(height: 28),

                  // ── Action Buttons ───────────────────────────────────────────
                  if (_saving)
                    const Center(child: CircularProgressIndicator())
                  else ...[
                    CustomButton(
                      text: isConfigured ? 'Update Credentials' : 'Save & Enable Gateway',
                      onPressed: _saveSettings,
                    ),

                    if (isConfigured) ...[
                      const SizedBox(height: 14),
                      OutlinedButton.icon(
                        icon: const Icon(Icons.link_off_rounded, size: 18),
                        label: const Text('Disconnect Gateway'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.error,
                          side: const BorderSide(color: AppColors.error),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: _disconnect,
                      ),
                    ],
                  ],

                  const SizedBox(height: 30),

                  // ── Steps Card ───────────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'How to get your Razorpay Keys:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: Color(0xFF1F2E27),
                          ),
                        ),
                        const SizedBox(height: 10),
                        _StepItem(
                          step: '1',
                          text: 'Log into your dashboard at dashboard.razorpay.com',
                        ),
                        _StepItem(
                          step: '2',
                          text: 'Go to Settings → API Keys from the sidebar',
                        ),
                        _StepItem(
                          step: '3',
                          text: 'Click "Generate Key" to get Key ID and Key Secret',
                        ),
                        _StepItem(
                          step: '4',
                          text: 'Copy and paste both keys into the fields above',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  final String step;
  final String text;

  const _StepItem({required this.step, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFFA87D26).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Text(
              step,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 11,
                color: Color(0xFFA87D26),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade700,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
