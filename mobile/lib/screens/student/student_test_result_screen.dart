import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';

class StudentTestResultScreen extends StatelessWidget {
  final Map<String, dynamic> test;
  const StudentTestResultScreen({super.key, required this.test});

  @override
  Widget build(BuildContext context) {
    // ── Safe type parsing ────────────────────────────────────────────────────
    final marks = (test['marksObtained'] as num?)?.toInt() ?? 0;
    final rawMax = (test['maxMarks'] ?? test['max_marks'] as num?)?.toInt();
    final max = (rawMax != null && rawMax > 0) ? rawMax : (marks > 0 ? marks : 1);
    final effectiveMax = max > 0 ? max : 1;
    final pct = ((marks / effectiveMax) * 100).toInt().clamp(0, 100);

    final correct = (test['correct'] as num?)?.toInt() ?? 0;
    final incorrect = (test['incorrect'] as num?)?.toInt() ?? 0;
    final skipped = (test['skipped'] as num?)?.toInt() ?? 0;

    final title = test['title']?.toString() ?? 'Test Result';
    final subject = test['subject']?.toString() ?? 'General';

    String dateStr = '';
    final rawDate = test['testDate'] ?? test['date'];
    if (rawDate != null) {
      try {
        final parsed = DateTime.parse(rawDate.toString()).toLocal();
        dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(parsed);
      } catch (_) {
        dateStr = rawDate.toString();
      }
    }

    final totalAnswered = correct + incorrect;
    final totalQuestions = correct + incorrect + skipped;
    final accuracy = totalAnswered > 0
        ? ((correct / totalAnswered) * 100).toInt()
        : (marks > 0 ? pct : 0);
    final attemptRate = totalQuestions > 0
        ? ((totalAnswered / totalQuestions) * 100).toInt()
        : 100;

    final color = pct >= 75
        ? AppColors.success
        : pct >= 50
            ? Colors.orange
            : AppColors.error;

    final badgeMessage = pct >= 90
        ? '🏆 Outstanding Performance!'
        : pct >= 75
            ? '🎉 Excellent Job!'
            : pct >= 50
                ? '👍 Good Effort!'
                : '📚 Keep Practicing!';

    final statusSubtitle = pct >= 75
        ? 'Great mastery! Keep up the brilliant momentum.'
        : pct >= 50
            ? 'Solid attempt. Revise your mistakes to score higher.'
            : 'Don\'t worry! Consistent practice is the key to mastery.';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF9),
      body: Column(
        children: [
          // ── Fixed Top Header ──────────────────────────────────────────────
          Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primaryDark, AppColors.primary],
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.arrow_back, color: Colors.white),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            badgeMessage,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                        const SizedBox(width: 24), // Balance back button
                      ],
                    ),
                    const SizedBox(height: 12),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 19,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      dateStr.isNotEmpty
                          ? '$subject • $dateStr'
                          : subject,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Scrollable Body (clean & non-overlapping) ─────────────────────
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              child: Column(
                children: [
                  // ── Score Card ──────────────────────────────────────────────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: color.withValues(alpha: 0.08),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: Border.all(color: color.withValues(alpha: 0.2)),
                    ),
                    child: Column(
                      children: [
                        // Circular Gauge
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 130,
                              height: 130,
                              child: CircularProgressIndicator(
                                value: (marks / effectiveMax).clamp(0.0, 1.0),
                                strokeWidth: 10,
                                backgroundColor: Colors.grey.shade100,
                                valueColor: AlwaysStoppedAnimation<Color>(color),
                                strokeCap: StrokeCap.round,
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '$pct%',
                                  style: TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                    color: color,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$marks / $max Marks',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            pct >= 75
                                ? 'PASSED • DISTINCTION'
                                : pct >= 50
                                    ? 'PASSED'
                                    : 'NEEDS REVISION',
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          statusSubtitle,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 22),

                        // Stats Row
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
                              color: Colors.grey.shade700,
                              bg: Colors.grey.shade100,
                              icon: Icons.remove_circle_rounded,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── Performance Summary Card ────────────────────────────────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.insights_rounded,
                              size: 20,
                              color: AppColors.primary,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Performance Breakdown',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _PerformanceRow(
                          label: 'Accuracy Rate',
                          value: accuracy,
                          suffix: '%',
                        ),
                        const SizedBox(height: 12),
                        _PerformanceRow(
                          label: 'Attempt Rate',
                          value: attemptRate,
                          suffix: '%',
                        ),
                        const SizedBox(height: 12),
                        _PerformanceRow(
                          label: 'Overall Score',
                          value: pct,
                          suffix: '%',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── Action Buttons ──────────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: const Text(
                        'Back to Assessments',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryDark,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 2,
                      ),
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
          borderRadius: BorderRadius.circular(16),
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
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w500,
              ),
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
    final clampedValue = value.clamp(0, 100);
    final color = clampedValue >= 75
        ? AppColors.success
        : clampedValue >= 50
            ? Colors.orange
            : AppColors.error;

    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: Colors.grey.shade700,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
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
                    value: clampedValue / 100,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                    minHeight: 7,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 44,
                child: Text(
                  '$clampedValue$suffix',
                  textAlign: TextAlign.end,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
