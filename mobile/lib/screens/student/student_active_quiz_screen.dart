import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../providers/student_providers.dart';
import '../../theme/app_colors.dart';

class StudentActiveQuizScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> test;
  const StudentActiveQuizScreen({super.key, required this.test});

  @override
  ConsumerState<StudentActiveQuizScreen> createState() =>
      _StudentActiveQuizScreenState();
}

class _StudentActiveQuizScreenState
    extends ConsumerState<StudentActiveQuizScreen> {
  int _currentIndex = 0;
  // Map of questionId -> optionId
  final Map<int, int> _selectedAnswers = {};
  Timer? _timer;
  int _secondsLeft = 1800; // default 30 mins

  bool _isLoadingQuestions = true;
  bool _isSubmitting = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _questions = [];

  int get _testId => (widget.test['id'] as num?)?.toInt() ?? 0;
  String get _testTitle => widget.test['title']?.toString() ?? 'Assessment';
  int get _maxMarks =>
      (widget.test['maxMarks'] ?? widget.test['max_marks'] as num?)?.toInt() ?? 0;

  @override
  void initState() {
    super.initState();
    final durationNum =
        widget.test['durationMinutes'] ??
        widget.test['duration_minutes'] ??
        widget.test['duration'];
    final durationMins = (durationNum as num?)?.toInt() ?? 30;
    _secondsLeft = (durationMins > 0 ? durationMins : 30) * 60;

    _fetchQuestions();
  }

  Future<void> _fetchQuestions() async {
    setState(() {
      _isLoadingQuestions = true;
      _errorMessage = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.get('/student/tests/$_testId/questions');
      if (res is List) {
        final parsed = res.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        setState(() {
          _questions = parsed;
          _isLoadingQuestions = false;
        });
        if (parsed.isNotEmpty) {
          _startTimer();
        }
      } else {
        setState(() {
          _errorMessage = 'Failed to parse questions';
          _isLoadingQuestions = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = friendlyErrorMessage(e);
        _isLoadingQuestions = false;
      });
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft <= 0) {
        _timer?.cancel();
        _submitQuiz();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
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

  void _selectOption(int questionId, int optionId) {
    setState(() => _selectedAnswers[questionId] = optionId);
  }

  Future<void> _submitQuiz() async {
    if (_isSubmitting) return;
    _timer?.cancel();

    setState(() => _isSubmitting = true);

    final answersPayload = <String, int>{};
    for (final entry in _selectedAnswers.entries) {
      answersPayload[entry.key.toString()] = entry.value;
    }

    try {
      final api = ref.read(apiServiceProvider);
      final res = await api.post('/student/tests/$_testId/submit', {
        'answers': answersPayload,
      });

      ref.invalidate(studentTestsProvider);

      if (!mounted) return;

      int marksObtained = 0;
      int maxMarks = _maxMarks;
      int correct = 0;
      int incorrect = 0;
      int skipped = 0;

      if (res is Map<String, dynamic>) {
        marksObtained = (res['marksObtained'] as num?)?.toInt() ?? 0;
        maxMarks = (res['maxMarks'] as num?)?.toInt() ?? _maxMarks;
        correct = (res['correct'] as num?)?.toInt() ?? 0;
        incorrect = (res['incorrect'] as num?)?.toInt() ?? 0;
        skipped = (res['skipped'] as num?)?.toInt() ?? 0;
      }

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => _QuizResultScreen(
            testTitle: _testTitle,
            correct: correct,
            incorrect: incorrect,
            skipped: skipped,
            marksObtained: marksObtained,
            maxMarks: maxMarks,
          ),
        ),
      );
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (!mounted) return;

      final msg = friendlyErrorMessage(e);
      final isWindowClosed = msg.toLowerCase().contains('no longer accepting') ||
          msg.toLowerCase().contains('window_closed') ||
          e.toString().contains('TEST_WINDOW_CLOSED');

      if (isWindowClosed) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: const Row(
              children: [
                Icon(Icons.timer_off_outlined, color: Colors.red),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Window Closed',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            content: const Text(
              'This test is no longer accepting submissions. The test deadline has ended and your status has been marked as Missed.',
              style: TextStyle(fontSize: 14),
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryDark,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Back to Assessments'),
              ),
            ],
          ),
        );
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: Colors.red,
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: _submitQuiz,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingQuestions) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.primaryDark,
          iconTheme: const IconThemeData(color: Colors.white),
          title: Text(
            _testTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                'Loading test questions...',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.primaryDark,
          iconTheme: const IconThemeData(color: Colors.white),
          title: Text(
            _testTitle,
            style: const TextStyle(color: Colors.white, fontSize: 16),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Colors.red),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _fetchQuestions,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Try Again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_questions.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.primaryDark,
          iconTheme: const IconThemeData(color: Colors.white),
          title: Text(
            _testTitle,
            style: const TextStyle(color: Colors.white, fontSize: 16),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.quiz_outlined, size: 54, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                const Text(
                  'No questions have been added to this test yet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Please check back later or contact your instructor.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Go Back'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final total = _questions.length;
    final currentQ = _questions[_currentIndex];
    final questionId = (currentQ['id'] as num?)?.toInt() ?? _currentIndex;
    final questionText = currentQ['questionText']?.toString() ?? '';
    final optionsRaw = currentQ['options'] as List<dynamic>? ?? [];
    final selectedOptionId = _selectedAnswers[questionId];
    final isLast = _currentIndex == total - 1;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          _testTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15,
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
      body: Stack(
        children: [
          Column(
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
                          style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 12,
                          ),
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
                          questionText,
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
                      ...List.generate(optionsRaw.length, (i) {
                        final opt = optionsRaw[i] as Map<String, dynamic>;
                        final optionId = (opt['id'] as num?)?.toInt() ?? (i + 1);
                        final optionText = opt['optionText']?.toString() ?? '';
                        final isSelected = selectedOptionId == optionId;

                        return GestureDetector(
                          onTap: () => _selectOption(questionId, optionId),
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
                                    optionText,
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
                            side: const BorderSide(
                              color: AppColors.primaryDark,
                            ),
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

          // Loading overlay when submitting
          if (_isSubmitting)
            Container(
              color: Colors.black45,
              child: const Center(
                child: Card(
                  color: Colors.white,
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text(
                          'Submitting your test...',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
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
  final int correct, incorrect, skipped, marksObtained, maxMarks;

  const _QuizResultScreen({
    required this.testTitle,
    required this.correct,
    required this.incorrect,
    required this.skipped,
    required this.marksObtained,
    required this.maxMarks,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveMax = maxMarks > 0 ? maxMarks : 1;
    final pct = ((marksObtained / effectiveMax) * 100).toInt().clamp(0, 100);
    final totalAnswered = correct + incorrect;
    final totalQuestions = correct + incorrect + skipped;
    final accuracy = totalAnswered > 0
        ? ((correct / totalAnswered) * 100).toInt()
        : (marksObtained > 0 ? pct : 0);

    final color = pct >= 75
        ? AppColors.success
        : pct >= 50
            ? Colors.orange
            : AppColors.error;

    final badgeMessage = pct >= 90
        ? '🏆 Outstanding Performance!'
        : pct >= 75
            ? '🎉 Excellent Score!'
            : pct >= 50
                ? '👍 Good Job!'
                : '📚 Keep Practicing!';

    final statusSubtitle = pct >= 75
        ? 'Great mastery! Keep up the brilliant momentum.'
        : pct >= 50
            ? 'Solid attempt. Revise your mistakes to score higher.'
            : 'Don\'t worry! Consistent practice will help you excel.';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF9),
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        elevation: 0,
        title: const Text(
          'Quiz Result',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Top Gradient Hero ───────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [AppColors.primaryDark, AppColors.primary],
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      badgeMessage,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    testTitle,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Assessment completed successfully',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // ── Main Body Floating Cards ────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Transform.translate(
                offset: const Offset(0, -18),
                child: Column(
                  children: [
                    // Score Card
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
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                        border: Border.all(color: color.withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        children: [
                          // Circular Progress Ring
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 130,
                                height: 130,
                                child: CircularProgressIndicator(
                                  value: (marksObtained / effectiveMax).clamp(0.0, 1.0),
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
                                    '$marksObtained / $maxMarks Marks',
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
                          const SizedBox(height: 24),

                          // Stat tiles row
                          Row(
                            children: [
                              _ResultStat(
                                label: 'Correct',
                                value: '$correct',
                                color: AppColors.success,
                                bg: AppColors.successLight,
                                icon: Icons.check_circle_rounded,
                              ),
                              const SizedBox(width: 8),
                              _ResultStat(
                                label: 'Incorrect',
                                value: '$incorrect',
                                color: AppColors.error,
                                bg: AppColors.errorLight,
                                icon: Icons.cancel_rounded,
                              ),
                              const SizedBox(width: 8),
                              _ResultStat(
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

                    const SizedBox(height: 16),

                    // Performance Insights Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
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
                                size: 18,
                                color: AppColors.primary,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Performance Summary',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          _InsightRow(
                            label: 'Accuracy Rate',
                            value: '$accuracy%',
                            color: AppColors.primary,
                          ),
                          const Divider(height: 16),
                          _InsightRow(
                            label: 'Total Questions Answered',
                            value: '$totalAnswered / ${totalQuestions > 0 ? totalQuestions : 1}',
                            color: AppColors.primaryDark,
                          ),
                          const Divider(height: 16),
                          _InsightRow(
                            label: 'Result Status',
                            value: pct >= 50 ? 'Passed' : 'Needs Practice',
                            color: color,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Primary Button: Go to Tests
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () =>
                            Navigator.of(context).popUntil((r) => r.isFirst),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: const Text(
                          'Go to Assessments',
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
      ),
    );
  }
}

class _ResultStat extends StatelessWidget {
  final String label, value;
  final Color color, bg;
  final IconData icon;

  const _ResultStat({
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
            const SizedBox(height: 2),
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

class _InsightRow extends StatelessWidget {
  final String label, value;
  final Color color;

  const _InsightRow({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade700,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
