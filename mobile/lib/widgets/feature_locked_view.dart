import 'package:flutter/material.dart';
import '../screens/settings/browse_plans_screen.dart';

/// Full-screen "locked" state for a bottom-nav tab whose feature isn't in
/// the tenant's current plan (e.g. Live Classes, Reports on Basic). Shown
/// instead of the real screen — the feature still exists and is
/// discoverable, but every action is replaced by a single upgrade CTA
/// that goes straight to plan selection.
class FeatureLockedView extends StatelessWidget {
  final String featureLabel;
  final String description;
  final IconData icon;
  /// False for roles that don't manage billing (e.g. teacher) — shows no
  /// button at all, since Browse Plans needs coaching_admin-only endpoints
  /// that would just fail for them. [description] should tell them to ask
  /// their admin instead.
  final bool showUpgradeButton;

  const FeatureLockedView({
    super.key,
    required this.featureLabel,
    required this.description,
    this.icon = Icons.lock_outline,
    this.showUpgradeButton = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFA87D26).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 40, color: const Color(0xFFA87D26)),
                ),
                const SizedBox(height: 20),
                Text(
                  '$featureLabel is a premium feature',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                if (showUpgradeButton) ...[
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const BrowsePlansScreen(),
                      ),
                    ),
                    icon: const Icon(Icons.upgrade, size: 18),
                    label: const Text('View Plans'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2E6656),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 14,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Small lock badge for a bottom-nav icon whose tab is gated — tap still
/// navigates to the tab (which then shows [FeatureLockedView]), so this is
/// purely a visual hint shown next to the icon, not a blocker itself.
class LockedTabIcon extends StatelessWidget {
  final IconData icon;
  const LockedTabIcon({super.key, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -4,
          top: -2,
          child: Container(
            padding: const EdgeInsets.all(2),
            decoration: const BoxDecoration(
              color: Color(0xFFA87D26),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lock, size: 8, color: Colors.white),
          ),
        ),
      ],
    );
  }
}

/// Inline lock for a single button/action (e.g. the WhatsApp reminder
/// button) — tapping shows a short upgrade prompt instead of the action
/// or a confusing backend error.
void showUpgradeRequiredSheet(
  BuildContext context, {
  required String featureLabel,
}) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            height: 4,
            width: 40,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Icon(Icons.lock_outline, size: 36, color: Colors.grey.shade500),
          const SizedBox(height: 12),
          Text(
            '$featureLabel is a premium feature',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Upgrade your plan to unlock this.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BrowsePlansScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2E6656),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('View Plans'),
            ),
          ),
        ],
      ),
    ),
  );
}
