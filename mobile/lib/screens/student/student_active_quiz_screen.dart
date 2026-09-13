import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

// ─── Mock Questions ─────────────────────────────────────────────────────────
final _mockQuestions = [
  {
    'q': 'Which of the following is the SI unit of force?',
    'options': ['Joule', 'Newton', 'Pascal', 'Watt'],
    'correct': 1,
  },
  {
    'q': 'The velocity of light in vacuum is approximately:',
    'options': ['3 × 10⁸ m/s', '3 × 10⁶ m/s', '3 × 10¹⁰ m/s', '3 × 10⁴ m/s'],
    'correct': 0,
  },
  {
    'q': 'Newton\'s Second Law of Motion states:',
    'options': ['F = ma', 'E = mc²', 'F = mv', 'a = F/m²'],
    'correct': 0,
  },
  {
    'q': 'Which phenomenon explains the bending of light?',
    'options': ['Reflection', 'Diffraction', 'Refraction', 'Interference'],
    'correct': 2,
  },
  {
    'q': 'The unit of electric current is:',
    'options': ['Volt', 'Ohm', 'Ampere', 'Watt'],
    'correct': 2,
  },
];

class StudentActiveQuizScreen extends StatefulWidget {
  final Map<String, dynamic> test;
  const StudentActiveQuizScreen({super.key, required this.test});

  @override
  State<StudentActiveQuizScreen> createState() =>
      _StudentActiveQuizScreenState();
}

class _StudentActiveQuizScreenState extends State<StudentActiveQuizScreen> {
  int _currentIndex = 0;
  final Map<int, int> _selectedAnswers = {};
  late Timer _timer;
  late int _secondsLeft;

  @override
  void initState() {
    super.initState();
    _secondsLeft = (widget.test['duration'] as int) * 60;
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft <= 0) {
        _timer.cancel();
        _submitQuiz();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String get _timeDisplay {
    final m = (_secondsLeft ~/ 60).toString().padLeft(2, '0');
    final s = (_secondsLeft % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Color get _timerColor {
    if (_secondsLeft < 60) return AppColors.error;
    if (_secondsLeft < 300) return Colors.orange;
    return AppColors.success;
  }

  void _selectOption(int optionIndex) {
    setState(() => _selectedAnswers[_currentIndex] = optionIndex);
  }

  void _submitQuiz() {
    _timer.cancel();
    // Count correct answers
    int correct = 0;
    int incorrect = 0;
    int skipped = 0;
    for (int i = 0; i < _mockQuestions.length; i++) {
      if (_selectedAnswers.containsKey(i)) {
        if (_selectedAnswers[i] == _mockQuestions[i]['correct']) {
          correct++;
        } else {
          incorrect++;
        }
      } else {
        skipped++;
      }
    }

    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => _QuizResultScreen(
          testTitle: widget.test['title'] as String,
          correct: correct,
          incorrect: incorrect,
          skipped: skipped,
          maxMarks: widget.test['maxMarks'] as int,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final q = _mockQuestions[_currentIndex];
    final options = q['options'] as List<String>;
    final total = _mockQuestions.length;
    final selectedOption = _selectedAnswers[_currentIndex];
    final isLast = _currentIndex == total - 1;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          widget.test['title'] as String,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          // Timer
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _timerColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(Icons.timer_rounded, size: 14, color: _timerColor),
                const SizedBox(width: 4),
                Text(
                  _timeDisplay,
                  style: TextStyle(
                    color: _timerColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Progress Bar ───────────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Question ${_currentIndex + 1} of $total',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    Text(
                      '${_selectedAnswers.length} answered',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: (_currentIndex + 1) / total,
                    backgroundColor: Colors.grey.shade100,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFFA87D26),
                    ),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),

          // ── Question + Options ─────────────────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Question box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade100),
                    ),
                    child: Text(
                      q['q'] as String,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryDark,
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Options
                  ...List.generate(options.length, (i) {
                    final isSelected = selectedOption == i;
                    return GestureDetector(
                      onTap: () => _selectOption(i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primaryDark
                              : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.primaryDark
                                : Colors.grey.shade200,
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isSelected
                                    ? const Color(0xFFA87D26)
                                    : Colors.grey.shade100,
                              ),
                              child: Center(
                                child: Text(
                                  String.fromCharCode(65 + i), // A, B, C, D
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: isSelected
                                        ? Colors.white
                                        : Colors.grey,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                options[i],
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isSelected
                                      ? Colors.white
                                      : AppColors.primaryDark,
                                  fontWeight: isSelected
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          // ── Bottom Navigation ──────────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            child: Row(
              children: [
                // Previous
                if (_currentIndex > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _currentIndex--),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.primaryDark),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text(
                        '← Previous',
                        style: TextStyle(
                          color: AppColors.primaryDark,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                if (_currentIndex > 0) const SizedBox(width: 12),
                // Next / Submit
                Expanded(
                  child: ElevatedButton(
                    onPressed: isLast
                        ? _submitQuiz
                        : () => setState(() => _currentIndex++),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isLast
                          ? AppColors.success
                          : AppColors.primaryDark,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      isLast ? 'Submit Quiz ✓' : 'Next →',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Inline Result Screen ────────────────────────────────────────────────────
class _QuizResultScreen extends StatelessWidget {
  final String testTitle;
  final int correct, incorrect, skipped, maxMarks;
  const _QuizResultScreen({
    required this.testTitle,
    required this.correct,
    required this.incorrect,
    required this.skipped,
    required this.maxMarks,
  });

  @override
  Widget build(BuildContext context) {
    final marksObtained = correct * (maxMarks ~/ _mockQuestions.length);
    final pct = (marksObtained / maxMarks * 100).toInt();
    final color = pct >= 75
        ? AppColors.success
        : pct >= 50
        ? Colors.orange
        : AppColors.error;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        title: const Text('Quiz Result', style: TextStyle(color: Colors.white)),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Score circle
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 6),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$pct%',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                    Text(
                      '$marksObtained/$maxMarks',
                      style: const TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text(
                testTitle,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 30),
              // Stat row
              Row(
                children: [
                  _ResultStat(
                    label: 'Correct',
                    value: '$correct',
                    color: AppColors.success,
                    icon: Icons.check_circle_rounded,
                  ),
                  _ResultStat(
                    label: 'Incorrect',
                    value: '$incorrect',
                    color: AppColors.error,
                    icon: Icons.cancel_rounded,
                  ),
                  _ResultStat(
                    label: 'Skipped',
                    value: '$skipped',
                    color: Colors.grey,
                    icon: Icons.remove_circle_rounded,
                  ),
                ],
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () =>
                      Navigator.of(context).popUntil((r) => r.isFirst),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryDark,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text(
                    'Go to Tests',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultStat extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _ResultStat({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
