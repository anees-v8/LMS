import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class StudentTestResultScreen extends StatelessWidget {
  final Map<String, dynamic> test;
  const StudentTestResultScreen({super.key, required this.test});

  @override
  Widget build(BuildContext context) {
    final marks = test['marksObtained'] as int;
    final max = test['maxMarks'] as int;
    final pct = (marks / max * 100).toInt();
    final correct = test['correct'] as int;
    final incorrect = test['incorrect'] as int;
    final skipped = test['skipped'] as int;
    final color = pct >= 75
        ? AppColors.success
        : pct >= 50
        ? Colors.orange
        : AppColors.error;
    final message = pct >= 75
        ? '🎉 Excellent!'
        : pct >= 50
        ? '👍 Good Job!'
        : '📚 Keep Practicing!';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Header ────────────────────────────────────────────────────
          SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.primaryDark,
            iconTheme: const IconThemeData(color: Colors.white),
            expandedHeight: 200,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1F2E27), Color(0xFF2E6656)],
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 40),
                      Text(
                        message,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        test['title'] as String,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${test['subject']} • ${test['date']}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.55),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // ── Score Card ────────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: color.withValues(alpha: 0.1),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                      border: Border.all(color: color.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      children: [
                        // Circular score
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 120,
                              height: 120,
                              child: CircularProgressIndicator(
                                value: marks / max,
                                strokeWidth: 10,
                                backgroundColor: Colors.grey.shade100,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  color,
                                ),
                                strokeCap: StrokeCap.round,
                              ),
                            ),
                            Column(
                              children: [
                                Text(
                                  '$pct%',
                                  style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                    color: color,
                                  ),
                                ),
                                Text(
                                  '$marks/$max Marks',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Stat row
                        Row(
                          children: [
                            _StatBox(
                              label: 'Correct',
                              value: '$correct',
                              color: AppColors.success,
                              bg: AppColors.successLight,
                              icon: Icons.check_circle_rounded,
                            ),
                            const SizedBox(width: 10),
                            _StatBox(
                              label: 'Incorrect',
                              value: '$incorrect',
                              color: AppColors.error,
                              bg: AppColors.errorLight,
                              icon: Icons.cancel_rounded,
                            ),
                            const SizedBox(width: 10),
                            _StatBox(
                              label: 'Skipped',
                              value: '$skipped',
                              color: Colors.grey,
                              bg: const Color(0xFFF5F5F5),
                              icon: Icons.remove_circle_rounded,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── Performance Summary ───────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Performance Summary',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _PerformanceRow(
                          label: 'Accuracy',
                          value: correct + incorrect == 0
                              ? 0
                              : (correct / (correct + incorrect) * 100).toInt(),
                          suffix: '%',
                        ),
                        const SizedBox(height: 10),
                        _PerformanceRow(
                          label: 'Attempt Rate',
                          value:
                              ((correct + incorrect) /
                                      (correct + incorrect + skipped) *
                                      100)
                                  .toInt(),
                          suffix: '%',
                        ),
                        const SizedBox(height: 10),
                        _PerformanceRow(
                          label: 'Score Percentage',
                          value: pct,
                          suffix: '%',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── Action buttons ────────────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(
                              color: AppColors.primaryDark,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: const Text(
                            '← Go Back',
                            style: TextStyle(
                              color: AppColors.primaryDark,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryDark,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: const Text(
                            'Review Answers',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label, value;
  final Color color, bg;
  final IconData icon;
  const _StatBox({
    required this.label,
    required this.value,
    required this.color,
    required this.bg,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

class _PerformanceRow extends StatelessWidget {
  final String label, suffix;
  final int value;
  const _PerformanceRow({
    required this.label,
    required this.value,
    required this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    final color = value >= 75
        ? AppColors.success
        : value >= 50
        ? Colors.orange
        : AppColors.error;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ),
        SizedBox(
          width: 160,
          child: Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: value / 100,
                    backgroundColor: Colors.grey.shade100,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                    minHeight: 7,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '$value$suffix',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: color,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
