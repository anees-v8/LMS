import 'package:flutter/material.dart';
import 'profile_avatar.dart';

class ProfileStat {
  final String label;
  final String value;
  const ProfileStat({required this.label, required this.value});
}

/// Gradient header shared by every role's profile screen: avatar (with
/// camera-upload built in), name, up to two subtitle lines, and an
/// optional row of quick stats. Pass an empty [stats] list to omit the
/// stats row entirely rather than showing empty/fabricated numbers.
class ProfileHeader extends StatelessWidget {
  final String name;
  final String? subtitleLine1;
  final String? subtitleLine2;
  final List<ProfileStat> stats;

  const ProfileHeader({
    super.key,
    required this.name,
    this.subtitleLine1,
    this.subtitleLine2,
    this.stats = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1F2E27), Color(0xFF2E6656)],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          child: Column(
            children: [
              const ProfileAvatar(),
              const SizedBox(height: 14),
              Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (subtitleLine1 != null && subtitleLine1!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitleLine1!,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.75),
                    fontSize: 12,
                  ),
                ),
              ],
              if (subtitleLine2 != null && subtitleLine2!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitleLine2!,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.55),
                    fontSize: 11,
                  ),
                ),
              ],
              if (stats.isNotEmpty) ...[
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < stats.length; i++) ...[
                      if (i > 0)
                        Container(
                          width: 1,
                          height: 30,
                          color: Colors.white.withValues(alpha: 0.2),
                        ),
                      _QuickStat(stat: stats[i]),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickStat extends StatelessWidget {
  final ProfileStat stat;
  const _QuickStat({required this.stat});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            stat.value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          Text(
            stat.label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.65),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
