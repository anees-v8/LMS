import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_textfield.dart';
import '../../services/api_service.dart';

/// Two-step flow: enter phone -> request OTP (emailed to the account's
/// email on file) -> enter the code + a new password. Deliberately plain
/// text messaging throughout ("if an account exists...") so this can't be
/// used to probe which phone numbers have accounts or have an email on file.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();

  bool _otpSent = false;
  bool _loading = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final phone = _phoneController.text.trim();
    if (!RegExp(r'^\d{10,15}$').hasMatch(phone)) {
      setState(() => _error = 'Enter a valid phone number.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      await api.post('/auth/forgot-password', {'phone': phone});
      setState(() {
        _otpSent = true;
        _loading = false;
        _info =
            'If an account with this phone has an email on file, a code was sent to it.';
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  Future<void> _resetPassword() async {
    final otp = _otpController.text.trim();
    final newPassword = _newPasswordController.text;
    if (!RegExp(r'^\d{6}$').hasMatch(otp)) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    if (newPassword.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      await api.post('/auth/reset-password', {
        'phone': _phoneController.text.trim(),
        'otp': otp,
        'newPassword': newPassword,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset. Please sign in with your new password.'),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2E27),
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Reset Password',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              Text(
                _otpSent
                    ? 'Enter the code emailed to you and your new password.'
                    : 'Enter your phone number. If your account has an email on file, we\'ll send a code to it.',
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
              const SizedBox(height: 24),
              CustomTextField(
                label: 'Phone',
                hint: 'Your login phone number',
                controller: _phoneController,
                prefixIcon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                enabled: !_otpSent,
              ),
              if (_otpSent) ...[
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'OTP Code',
                  hint: '6-digit code',
                  controller: _otpController,
                  prefixIcon: Icons.pin_outlined,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'New Password',
                  hint: 'Min 6 characters',
                  controller: _newPasswordController,
                  prefixIcon: Icons.lock_outline,
                  isPassword: true,
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _loading ? null : _sendOtp,
                    child: const Text('Resend code'),
                  ),
                ),
              ],
              if (_info != null) ...[
                const SizedBox(height: 8),
                Text(
                  _info!,
                  style: const TextStyle(color: Colors.green, fontSize: 13),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13),
                ),
              ],
              const SizedBox(height: 24),
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: CustomButton(
                        text: _otpSent ? 'Reset Password' : 'Send Code',
                        onPressed: _otpSent ? _resetPassword : _sendOtp,
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
