import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../screens/auth/login_screen.dart';

/// Shared "Logout" card + confirmation dialog — identical across roles.
class ProfileLogoutButton extends ConsumerWidget {
  const ProfileLogoutButton({super.key});

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const _LogoutConfirmDialog(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _confirmLogout(context, ref),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.errorLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.logout_rounded, color: AppColors.error, size: 20),
            SizedBox(width: 10),
            Text(
              'Logout',
              style: TextStyle(
                color: AppColors.error,
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Its own stateful widget (not inline in a builder) so the "logging out"
/// spinner state survives independently of the parent rebuilding — tapping
/// Logout disables both buttons and shows progress for the real work
/// `logout()` does (a network call to unregister the push token, an SQLite
/// wipe, and several SharedPreferences removals) instead of leaving the
/// dialog looking frozen with no feedback until the screen jumps away.
class _LogoutConfirmDialog extends ConsumerStatefulWidget {
  const _LogoutConfirmDialog();

  @override
  ConsumerState<_LogoutConfirmDialog> createState() =>
      _LogoutConfirmDialogState();
}

class _LogoutConfirmDialogState extends ConsumerState<_LogoutConfirmDialog> {
  bool _loggingOut = false;

  Future<void> _handleLogout() async {
    setState(() => _loggingOut = true);
    try {
      await ref.read(authProvider.notifier).logout();
    } catch (_) {
      // logout() clears local state regardless of whether the push-token
      // unregister call succeeded — proceed to login either way rather
      // than leaving the user stuck on a failed network call.
    }
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Logout', style: TextStyle(fontWeight: FontWeight.bold)),
      content: _loggingOut
          ? const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 14),
                Text('Logging out...'),
              ],
            )
          : const Text('Are you sure you want to log out?'),
      actions: [
        TextButton(
          onPressed: _loggingOut ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _loggingOut ? null : _handleLogout,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
          child: const Text('Logout', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
