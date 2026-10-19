import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
          final durationNum =
              widget.test['durationMinutes'] ??
              widget.test['duration_minutes'] ??
              widget.test['duration'];
          final durationMins = (durationNum as num?)?.toInt() ?? 30;
          await _initTimerAndStorage(durationMins > 0 ? durationMins : 30);
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

  Future<void> _initTimerAndStorage(int totalDurationMins) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final startKey = 'test_start_time_$_testId';
      final answersKey = 'test_answers_$_testId';

      // Restore previously saved answers if any
      final savedJson = prefs.getString(answersKey);
      if (savedJson != null) {
        try {
          final decoded = json.decode(savedJson) as Map<String, dynamic>;
          decoded.forEach((k, v) {
            final qId = int.tryParse(k);
            final optId = v is int ? v : int.tryParse(v.toString());
            if (qId != null && optId != null) {
              _selectedAnswers[qId] = optId;
            }
          });
        } catch (_) {}
      }

      final totalDurationSeconds = totalDurationMins * 60;
      final storedStart = prefs.getInt(startKey);
      final now = DateTime.now().millisecondsSinceEpoch;

      if (storedStart == null) {
        // First time entering test — record official start timestamp
        await prefs.setInt(startKey, now);
        _secondsLeft = totalDurationSeconds;
      } else {
        // Returning/resumed: calculate elapsed wall-clock seconds to prevent timer resets
        final elapsedSeconds = ((now - storedStart) / 1000).floor();
        final remaining = totalDurationSeconds - elapsedSeconds;
        if (remaining <= 0) {
          _secondsLeft = 0;
          _startTimer();
          return;
        }
        _secondsLeft = remaining;
      }
    } catch (_) {}

    _startTimer();
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
    _saveAnswersLocally();
  }

  Future<void> _saveAnswersLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final answersPayload = <String, int>{};
      for (final entry in _selectedAnswers.entries) {
        answersPayload[entry.key.toString()] = entry.value;
      }
      await prefs.setString('test_answers_$_testId', json.encode(answersPayload));
    } catch (_) {}
  }

  Future<void> _showExitWarningDialog() async {
    if (_isSubmitting) return;
    final totalAnswered = _selectedAnswers.length;
    final totalQuestions = _questions.length;
    final unAnswered = totalQuestions - totalAnswered;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Exit Assessment?',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lock_clock, color: Colors.red, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'If you close or leave this screen, the test will be AUTOMATICALLY SUBMITTED with your current answers. You cannot re-take this test.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Current Progress: $totalAnswered answered • $unAnswered unanswered',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Are you sure you want to cancel and stay, or confirm and submit?',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    side: BorderSide(color: Colors.grey.shade400),
                  ),
                  child: const Text(
                    'Cancel & Stay',
                    style: TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    _submitQuiz();
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Confirm & Submit',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _showSubmitConfirmDialog() async {
    if (_isSubmitting) return;
    final totalAnswered = _selectedAnswers.length;
    final totalQuestions = _questions.length;
    final unAnswered = totalQuestions - totalAnswered;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: AppColors.success, size: 24),
            SizedBox(width: 10),
            Text(
              'Submit Assessment?',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'You have answered $totalAnswered out of $totalQuestions questions.',
              style: const TextStyle(fontSize: 14),
            ),
            if (unAnswered > 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Colors.orange, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$unAnswered question${unAnswered > 1 ? 's are' : ' is'} still unanswered.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.orange.shade900,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            const Text(
              'Once submitted, your answers cannot be modified. Are you ready to submit?',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    side: BorderSide(color: Colors.grey.shade400),
                  ),
                  child: const Text(
                    'Review',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    _submitQuiz();
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Confirm & Submit',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _submitQuiz() async {
    if (_isSubmitting) return;
    _timer?.cancel();

    setState(() => _isSubmitting = true);

    // Clear local test session storage
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('test_start_time_$_testId');
      await prefs.remove('test_answers_$_testId');
    } catch (_) {}

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

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _showExitWarningDialog();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.primaryDark,
          automaticallyImplyLeading: false,
          leading: IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.white),
            tooltip: 'Exit Test',
            onPressed: _showExitWarningDialog,
          ),
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
            // Timer Badge
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _timerColor.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _timerColor.withValues(alpha: 0.45),
                  width: 1,
                ),
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
                // ── Progress Bar & Question Palette ───────────────────────────
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Question ${_currentIndex + 1} of $total',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.primaryDark,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${_selectedAnswers.length}/$total Answered',
                              style: const TextStyle(
                                color: AppColors.success,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
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
                      const SizedBox(height: 12),
                      // Horizontal Question Palette Strip
                      SizedBox(
                        height: 36,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: total,
                          separatorBuilder: (context, index) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            final qId = (_questions[index]['id'] as num?)?.toInt() ?? index;
                            final isAnswered = _selectedAnswers.containsKey(qId);
                            final isCurrent = index == _currentIndex;

                            return InkWell(
                              onTap: () => setState(() => _currentIndex = index),
                              borderRadius: BorderRadius.circular(10),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: isCurrent
                                      ? AppColors.primaryDark
                                      : (isAnswered
                                          ? AppColors.success.withValues(alpha: 0.15)
                                          : Colors.grey.shade100),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isCurrent
                                        ? const Color(0xFFA87D26)
                                        : (isAnswered ? AppColors.success : Colors.grey.shade300),
                                    width: isCurrent ? 2 : 1,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    '${index + 1}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: isCurrent
                                          ? Colors.white
                                          : (isAnswered ? AppColors.success : Colors.grey.shade700),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
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
                      // Previous Question Button
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _currentIndex > 0
                              ? () => setState(() => _currentIndex--)
                              : null,
                          icon: const Icon(Icons.arrow_back_rounded, size: 18),
                          label: const Text(
                            'Previous',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primaryDark,
                            disabledForegroundColor: Colors.grey.shade400,
                            side: BorderSide(
                              color: _currentIndex > 0
                                  ? AppColors.primaryDark
                                  : Colors.grey.shade300,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Next Question / Submit Test Button
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: isLast
                              ? _showSubmitConfirmDialog
                              : () => setState(() => _currentIndex++),
                          icon: Icon(
                            isLast ? Icons.check_circle_rounded : Icons.arrow_forward_rounded,
                            size: 18,
                          ),
                          label: Text(
                            isLast ? 'Submit Test' : 'Next',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLast
                                ? AppColors.success
                                : AppColors.primaryDark,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            elevation: isLast ? 2 : 0,
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
