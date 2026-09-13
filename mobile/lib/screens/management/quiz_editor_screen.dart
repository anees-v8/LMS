import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';

class QuizEditorScreen extends ConsumerStatefulWidget {
  final int testId;
  final String testTitle;

  /// When true, the Add Question sheet opens automatically on first frame —
  /// used right after creating a quiz so the teacher lands straight in the
  /// question form instead of having to tap into the (still-empty) quiz.
  final bool autoOpenAddQuestion;

  const QuizEditorScreen({
    super.key,
    required this.testId,
    required this.testTitle,
    this.autoOpenAddQuestion = false,
  });

  @override
  ConsumerState<QuizEditorScreen> createState() => _QuizEditorScreenState();
}

class _QuizEditorScreenState extends ConsumerState<QuizEditorScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.autoOpenAddQuestion) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showAddQuestionModal();
      });
    }
  }

  void _showAddQuestionModal({Map<String, dynamic>? existingQuestion}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _AddQuestionSheet(
        ref: ref,
        testId: widget.testId,
        existingQuestion: existingQuestion,
      ),
    );
  }

  Future<void> _deleteQuestion(int questionId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Question'),
        content: const Text('Are you sure you want to delete this question?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      final api = ref.read(apiServiceProvider);
      await api.delete('/teacher/questions/$questionId');
      ref.invalidate(testQuestionsProvider(widget.testId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyErrorMessage(e)),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final questionsAsync = ref.watch(testQuestionsProvider(widget.testId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          widget.testTitle,
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: questionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text(friendlyErrorMessage(err))),
        data: (questions) {
          if (questions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.quiz_outlined,
                    size: 64,
                    color: Colors.grey.shade300,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No questions added yet.',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Tap + to add your first question.',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 160),
            itemCount: questions.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final q = questions[index];
              final options = (q['options'] as List<dynamic>?) ?? [];
              final qImage = q['imageUrl']?.toString();

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            q['questionText'] ?? '',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Text(
                          '[${q['marks']} M]',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    // Question image preview
                    if (qImage != null && qImage.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 10, left: 38),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            qImage,
                            height: 120,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.broken_image,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 12),
                    ...options.map((opt) {
                      final isCorrect = opt['isCorrect'] == true;
                      final optImg = opt['imageUrl']?.toString();
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: isCorrect
                              ? Colors.green.shade50
                              : Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isCorrect
                                ? Colors.green
                                : Colors.grey.shade300,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  isCorrect
                                      ? Icons.check_circle
                                      : Icons.radio_button_unchecked,
                                  size: 16,
                                  color: isCorrect ? Colors.green : Colors.grey,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    opt['optionText'] ??
                                        (optImg != null && optImg.isNotEmpty
                                            ? '[Image option]'
                                            : ''),
                                    style: TextStyle(
                                      color: isCorrect
                                          ? Colors.green.shade700
                                          : Colors.black87,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (optImg != null && optImg.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(
                                  top: 6,
                                  left: 24,
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: Image.network(
                                    optImg,
                                    height: 60,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.broken_image,
                                      color: Colors.grey,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton.icon(
                          onPressed: () =>
                              _showAddQuestionModal(existingQuestion: q),
                          icon: const Icon(
                            Icons.edit_outlined,
                            size: 16,
                            color: AppColors.primary,
                          ),
                          label: const Text(
                            'Edit',
                            style: TextStyle(color: AppColors.primary),
                          ),
                        ),
                        const SizedBox(width: 4),
                        TextButton.icon(
                          onPressed: () => _deleteQuestion(q['id'] as int),
                          icon: const Icon(
                            Icons.delete_outline,
                            size: 16,
                            color: Colors.red,
                          ),
                          label: const Text(
                            'Delete',
                            style: TextStyle(color: Colors.red),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddQuestionModal(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          'Add Question',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}

// ─── Add/Edit Question sheet ───────────────────────────────────────────────

class _OptionEntry {
  final int? id;
  final TextEditingController textCtrl;
  String? imageUrl;
  bool isCorrect;
  _OptionEntry({
    this.id,
    required this.textCtrl,
    this.imageUrl,
    required this.isCorrect,
  });
}

class _AddQuestionSheet extends StatefulWidget {
  final WidgetRef ref;
  final int testId;
  final Map<String, dynamic>? existingQuestion;
  const _AddQuestionSheet({
    required this.ref,
    required this.testId,
    this.existingQuestion,
  });

  @override
  State<_AddQuestionSheet> createState() => _AddQuestionSheetState();
}

class _AddQuestionSheetState extends State<_AddQuestionSheet> {
  late final TextEditingController _textCtrl;
  late final TextEditingController _marksCtrl;
  String? _questionImageUrl;
  late List<_OptionEntry> _options;
  bool _isSaving = false;

  bool get _isEditing => widget.existingQuestion != null;

  @override
  void initState() {
    super.initState();
    final q = widget.existingQuestion;
    _textCtrl = TextEditingController(text: q?['questionText'] ?? '');
    _marksCtrl = TextEditingController(text: q?['marks']?.toString() ?? '1');
    _questionImageUrl = q?['imageUrl'] as String?;
    _options = _isEditing
        ? ((q!['options'] as List<dynamic>?) ?? [])
              .map(
                (o) => _OptionEntry(
                  id: o['id'] as int?,
                  textCtrl: TextEditingController(text: o['optionText'] ?? ''),
                  imageUrl: o['imageUrl'] as String?,
                  isCorrect: o['isCorrect'] == true,
                ),
              )
              .toList()
        : [
            _OptionEntry(textCtrl: TextEditingController(), isCorrect: true),
            _OptionEntry(textCtrl: TextEditingController(), isCorrect: false),
          ];
  }

  // Only meaningful in "Add" mode — editing is always a single question.
  bool _saveAndAddAnother = true;

  @override
  void dispose() {
    _textCtrl.dispose();
    _marksCtrl.dispose();
    for (final o in _options) {
      o.textCtrl.dispose();
    }
    super.dispose();
  }

  /// Clears the form back to a blank "new question" state without closing
  /// the sheet, so a teacher adding many questions in a row doesn't have to
  /// re-tap the FAB every single time.
  void _resetForNextQuestion() {
    _textCtrl.clear();
    _marksCtrl.text = '1';
    for (final o in _options) {
      o.textCtrl.dispose();
    }
    setState(() {
      _questionImageUrl = null;
      _options = [
        _OptionEntry(textCtrl: TextEditingController(), isCorrect: true),
        _OptionEntry(textCtrl: TextEditingController(), isCorrect: false),
      ];
    });
  }

  Future<void> _save() async {
    if (_textCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Question text is required')),
      );
      return;
    }
    final hasInvalidOption = _options.any(
      (o) =>
          o.textCtrl.text.trim().isEmpty &&
          (o.imageUrl == null || o.imageUrl!.isEmpty),
    );
    if (hasInvalidOption) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Each option must have text or an image')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final api = widget.ref.read(apiServiceProvider);
      final payload = {
        'questionText': _textCtrl.text.trim(),
        if (_questionImageUrl != null && _questionImageUrl!.isNotEmpty)
          'imageUrl': _questionImageUrl,
        'marks': int.tryParse(_marksCtrl.text) ?? 1,
        'options': _options.map((o) {
          final text = o.textCtrl.text.trim();
          return {
            if (o.id != null) 'id': o.id,
            if (text.isNotEmpty) 'optionText': text,
            if (o.imageUrl != null && o.imageUrl!.isNotEmpty)
              'imageUrl': o.imageUrl,
            'isCorrect': o.isCorrect,
          };
        }).toList(),
      };

      if (_isEditing) {
        await api.put(
          '/teacher/questions/${widget.existingQuestion!['id']}',
          payload,
        );
      } else {
        await api.post('/teacher/tests/${widget.testId}/questions', payload);
      }
      widget.ref.invalidate(testQuestionsProvider(widget.testId));

      if (!_isEditing && _saveAndAddAnother) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Question added'),
              duration: Duration(seconds: 1),
            ),
          );
          _resetForNextQuestion();
        }
      } else if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(friendlyErrorMessage(e)),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle — consistent with every other bottom sheet in the app.
            Center(
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                height: 4,
                width: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _isEditing ? 'Edit Question' : 'Add Question',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _textCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Question Text *',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            _ImagePickerField(
              ref: widget.ref,
              imageUrl: _questionImageUrl,
              onChanged: (url) => setState(() => _questionImageUrl = url),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _marksCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Marks',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Options',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 4),
            const Text(
              'Select the radio button next to the correct answer',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 10),
            ...List.generate(_options.length, (i) {
              final o = _options[i];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Row(
                  children: [
                    Radio<int>(
                      value: i,
                      groupValue: _options.indexWhere((opt) => opt.isCorrect),
                      onChanged: (val) {
                        setState(() {
                          for (final opt in _options) {
                            opt.isCorrect = false;
                          }
                          _options[val!].isCorrect = true;
                        });
                      },
                      activeColor: AppColors.success,
                    ),
                    Expanded(
                      child: TextField(
                        controller: o.textCtrl,
                        decoration: InputDecoration(
                          hintText: 'Option ${i + 1}',
                          border: const OutlineInputBorder(),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                      ),
                    ),
                    if (_options.length > 2)
                      IconButton(
                        icon: const Icon(
                          Icons.remove_circle,
                          color: Colors.red,
                        ),
                        onPressed: () => setState(() {
                          o.textCtrl.dispose();
                          _options.removeAt(i);
                        }),
                      ),
                  ],
                ),
              );
            }),
            if (_options.length < 5)
              TextButton.icon(
                onPressed: () => setState(
                  () => _options.add(
                    _OptionEntry(
                      textCtrl: TextEditingController(),
                      isCorrect: false,
                    ),
                  ),
                ),
                icon: const Icon(Icons.add),
                label: const Text('Add Option'),
              ),
            const SizedBox(height: 12),
            if (!_isEditing)
              InkWell(
                onTap: () =>
                    setState(() => _saveAndAddAnother = !_saveAndAddAnother),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Checkbox(
                        value: _saveAndAddAnother,
                        activeColor: AppColors.primary,
                        onChanged: (val) =>
                            setState(() => _saveAndAddAnother = val ?? true),
                      ),
                      const Expanded(
                        child: Text(
                          'Save & add another question',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                onPressed: _isSaving ? null : _save,
                child: _isSaving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        _isEditing
                            ? 'Update Question'
                            : (_saveAndAddAnother
                                  ? 'Save & Add Next'
                                  : 'Save Question'),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ─── Reusable pick-from-device + upload-to-Cloudinary field ────────────────
// Mirrors the exact signature-fetch + direct-multipart-upload flow already
// used for content uploads (teacher_content_screen.dart) — same backend
// endpoint (/teacher/upload-signature), same Cloudinary "auto/upload" URL.

class _ImagePickerField extends StatefulWidget {
  final WidgetRef ref;
  final String? imageUrl;
  final ValueChanged<String?> onChanged;
  static const double _previewHeight = 100;

  const _ImagePickerField({
    required this.ref,
    required this.imageUrl,
    required this.onChanged,
  });

  @override
  State<_ImagePickerField> createState() => _ImagePickerFieldState();
}

class _ImagePickerFieldState extends State<_ImagePickerField> {
  bool _uploading = false;
  String? _error;

  Future<void> _pickAndUpload() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png'],
        withReadStream: true,
        withData: false,
      );
      if (result == null || result.files.isEmpty) return;
      final picked = result.files.first;
      if (picked.size > 5 * 1024 * 1024) {
        setState(() => _error = 'Image must be under 5MB');
        return;
      }

      setState(() {
        _uploading = true;
        _error = null;
      });

      final api = widget.ref.read(apiServiceProvider);
      final sig = await api.get('/teacher/upload-signature');
      final cloudName = sig['cloudName'];
      final apiKey = sig['apiKey'];
      if (cloudName == null || apiKey == null) {
        throw Exception('Cloudinary is not configured on the server.');
      }

      final uri = Uri.parse(
        'https://api.cloudinary.com/v1_1/$cloudName/auto/upload',
      );
      final req = http.MultipartRequest('POST', uri)
        ..fields['api_key'] = apiKey.toString()
        ..fields['timestamp'] = sig['timestamp'].toString()
        ..fields['signature'] = sig['signature']
        ..fields['folder'] = sig['folder'];

      final file = File(picked.path!);
      final length = await file.length();
      req.files.add(
        http.MultipartFile(
          'file',
          file.openRead(),
          length,
          filename: picked.name,
        ),
      );

      final streamed = await req.send();
      final res = await http.Response.fromStream(streamed);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = jsonDecode(res.body);
        widget.onChanged(data['secure_url'] as String);
      } else {
        throw Exception('Upload failed (${res.statusCode})');
      }
    } catch (e) {
      setState(() => _error = 'Upload failed: ${friendlyErrorMessage(e)}');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_uploading) {
      return Container(
        height: _ImagePickerField._previewHeight,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    if (widget.imageUrl != null && widget.imageUrl!.isNotEmpty) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              widget.imageUrl!,
              height: _ImagePickerField._previewHeight,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                height: _ImagePickerField._previewHeight,
                color: Colors.grey.shade100,
                child: const Icon(Icons.broken_image, color: Colors.grey),
              ),
            ),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: () => widget.onChanged(null),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Colors.black54,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, color: Colors.white, size: 16),
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Material(
          color: AppColors.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            onTap: _pickAndUpload,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.add_photo_alternate_outlined,
                    size: 18,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Add Image (optional)',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _error!,
              style: const TextStyle(color: AppColors.error, fontSize: 11),
            ),
          ),
      ],
    );
  }
}
