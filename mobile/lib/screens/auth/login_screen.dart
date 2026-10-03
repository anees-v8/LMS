import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_textfield.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../utils/role_router.dart';
import '../../utils/constants.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _acceptedLegal = false;

  // Hidden until we know this phone actually needs it — most logins are a
  // returning user who already accepted, so the checkbox stays out of the
  // way by default instead of showing on every single login.
  bool _needsAcceptance = false;
  bool _checkingTerms = false;
  String? _lastCheckedPhone;

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  /// Fires once the phone field has a plausible 10-15 digit number — checks
  /// whether THIS phone's account (if any) still needs to accept the
  /// current terms, and shows/hides the checkbox accordingly. A new/unknown
  /// phone always shows it (server treats an unknown phone as "needs
  /// acceptance"), so first-time users are never blocked from accepting.
  Future<void> _checkTermsStatus() async {
    final phone = _phoneController.text.trim();
    if (!RegExp(r'^\d{10,15}$').hasMatch(phone) || phone == _lastCheckedPhone) {
      return;
    }
    _lastCheckedPhone = phone;
    setState(() => _checkingTerms = true);
    try {
      final api = ref.read(apiServiceProvider);
      final result = await api.get('/auth/terms-status?phone=$phone') as Map;
      if (!mounted || _phoneController.text.trim() != phone) return;
      setState(() {
        _needsAcceptance = result['needsAcceptance'] == true;
        _acceptedLegal = false;
        _checkingTerms = false;
      });
    } catch (_) {
      // Network hiccup or similar — fail safe by showing the checkbox
      // rather than silently letting a not-yet-accepted user skip it.
      if (!mounted) return;
      setState(() {
        _needsAcceptance = true;
        _checkingTerms = false;
      });
    }
  }

  void _handleLogin() async {
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;

    if (phone.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter phone and password.')),
      );
      return;
    }
    if (_needsAcceptance && !_acceptedLegal) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the Privacy Policy and Terms.'),
        ),
      );
      return;
    }

    final success = await ref
        .read(authProvider.notifier)
        .login(phone, password, acceptedTerms: _needsAcceptance);

    if (success && mounted) {
      final role = ref.read(authProvider).userRole;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => homeScreenForRole(role)),
      );
    } else if (mounted) {
      final error = ref.read(authProvider).error ?? 'Login Failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: Colors.red),
      );
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      body: Stack(
        children: [
          // Header Background
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            height: MediaQuery.of(context).viewInsets.bottom > 0
                ? MediaQuery.of(context).size.height * 0.25
                : MediaQuery.of(context).size.height * 0.4,
            decoration: const BoxDecoration(
              color: Color(0xFF1F2E27),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 16.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AnimatedSize(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                    child: MediaQuery.of(context).viewInsets.bottom > 0
                        ? const SizedBox(height: 16)
                        : Column(
                            children: [
                              const SizedBox(height: 16),
                              Image.asset(
                                'assets/images/logo_splash.png',
                                height: 100,
                                width: 100,
                                fit: BoxFit.contain,
                              ),
                              Transform.translate(
                                offset: const Offset(0, -10),
                                child: Column(
                                  children: [
                                    const Text(
                                      'Campus',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 32,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Run your institute. Delight every student.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.white.withValues(
                                          alpha: 0.7,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 48),
                            ],
                          ),
                  ),
                  // Login Card
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 15,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Welcome Back',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2E27),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Sign in to continue',
                          style: TextStyle(
                            fontSize: 14,
                            color: Color(0xFF2E6656),
                          ),
                        ),
                        const SizedBox(height: 32),
                        CustomTextField(
                          label: 'Phone',
                          hint: 'Enter your phone number',
                          prefixIcon: Icons.phone_outlined,
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          onChanged: (_) => _checkTermsStatus(),
                        ),
                        const SizedBox(height: 24),
                        CustomTextField(
                          label: 'Password',
                          hint: 'Enter your password',
                          isPassword: true,
                          prefixIcon: Icons.lock_outline,
                          controller: _passwordController,
                        ),
                        AnimatedSize(
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeInOut,
                          alignment: Alignment.topCenter,
                          child: (_needsAcceptance && !_checkingTerms)
                              ? Padding(
                                  padding: const EdgeInsets.only(top: 16),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: Checkbox(
                                          value: _acceptedLegal,
                                          onChanged: (v) => setState(
                                            () => _acceptedLegal = v ?? false,
                                          ),
                                          activeColor: const Color(0xFF1F2E27),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Padding(
                                          padding: const EdgeInsets.only(
                                            top: 4,
                                          ),
                                          child: RichText(
                                            text: TextSpan(
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: Colors.black87,
                                                height: 1.4,
                                              ),
                                              children: [
                                                const TextSpan(
                                                  text: 'I accept the ',
                                                ),
                                                TextSpan(
                                                  text: 'Privacy Policy',
                                                  style: const TextStyle(
                                                    color: Color(0xFFA87D26),
                                                    fontWeight: FontWeight.w600,
                                                    decoration: TextDecoration
                                                        .underline,
                                                  ),
                                                  recognizer:
                                                      TapGestureRecognizer()
                                                        ..onTap = () => _openUrl(
                                                          Constants
                                                              .privacyPolicyUrl,
                                                        ),
                                                ),
                                                const TextSpan(text: ' and '),
                                                TextSpan(
                                                  text: 'Terms & Conditions',
                                                  style: const TextStyle(
                                                    color: Color(0xFFA87D26),
                                                    fontWeight: FontWeight.w600,
                                                    decoration: TextDecoration
                                                        .underline,
                                                  ),
                                                  recognizer: TapGestureRecognizer()
                                                    ..onTap = () => _openUrl(
                                                      Constants
                                                          .termsAndConditionsUrl,
                                                    ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                        const SizedBox(height: 24),
                        authState.isLoading
                            ? const Center(child: CircularProgressIndicator())
                            : SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: CustomButton(
                                  text: 'Sign In →',
                                  onPressed: _handleLogin,
                                ),
                              ),
                        const SizedBox(height: 24),
                        const Text(
                          'Powered by Campus',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
