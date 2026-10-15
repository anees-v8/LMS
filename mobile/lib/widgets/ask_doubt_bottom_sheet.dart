import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../providers/student_providers.dart';
import '../services/api_service.dart';
import '../utils/app_toast.dart';

void showAskDoubtBottomSheet(
  BuildContext context, {
  String? initialChapter,
  int? initialTeacherId,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => AskDoubtBottomSheet(
      initialChapter: initialChapter,
      initialTeacherId: initialTeacherId,
    ),
  );
}

class AskDoubtBottomSheet extends ConsumerStatefulWidget {
  final String? initialChapter;
  final int? initialTeacherId;

  const AskDoubtBottomSheet({
    super.key,
    this.initialChapter,
    this.initialTeacherId,
  });

  @override
  ConsumerState<AskDoubtBottomSheet> createState() =>
      _AskDoubtBottomSheetState();
}

class _AskDoubtBottomSheetState extends ConsumerState<AskDoubtBottomSheet> {
  late TextEditingController _chapterController;
  int? _selectedTeacherId;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _chapterController =
        TextEditingController(text: widget.initialChapter ?? '');
    _selectedTeacherId = widget.initialTeacherId;
  }

  @override
  void dispose() {
    _chapterController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final topic = _chapterController.text.trim();
    if (topic.isEmpty) {
      AppToast.showError(
        context,
        'Please enter a chapter name or doubt topic',
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final api = ref.read(apiServiceProvider);
      final queryParams = <String, String>{
        'chapter': topic,
      };
      if (_selectedTeacherId != null) {
        queryParams['teacherId'] = _selectedTeacherId.toString();
      }

      final uri = Uri(
        path: '/student/ask-doubt',
        queryParameters: queryParams,
      );

      final res = await api.get(uri.toString());
      final waUrl = res['waUrl'] as String?;

      if (!mounted) return;
      Navigator.of(context).pop();

      if (waUrl != null && waUrl.isNotEmpty) {
        final parsed = Uri.parse(waUrl);
        final launched = await launchUrl(
          parsed,
          mode: LaunchMode.externalApplication,
        );
        if (!launched && mounted) {
          AppToast.showError(
            context,
            'Could not open WhatsApp. Please ensure WhatsApp is installed.',
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      AppToast.showError(
        context,
        'Failed to generate WhatsApp doubt link: $e',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final teachersAsync = ref.watch(studentTeachersProvider);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 20,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Drag Handle ──────────────────────────────────────────────
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // ── Header ───────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primaryDark, AppColors.primary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.question_answer_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ask a Doubt',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Instant resolution on WhatsApp',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, color: Colors.grey),
                  splashRadius: 20,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Divider(height: 1, color: AppColors.borderLight),

          // ── Scrollable Body ──────────────────────────────────────────
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Topic / Chapter Input ─────────────────────────────
                  const Text(
                    'Topic or Chapter Name',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: TextField(
                      controller: _chapterController,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.primaryDark,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        hintText: 'e.g. Physics Chapter 3: Kinematics or question...',
                        hintStyle: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade400,
                        ),
                        prefixIcon: const Icon(
                          Icons.menu_book_rounded,
                          color: AppColors.primary,
                          size: 20,
                        ),
                        suffixIcon: _chapterController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(
                                  Icons.clear_rounded,
                                  size: 18,
                                  color: Colors.grey,
                                ),
                                onPressed: () {
                                  setState(() => _chapterController.clear());
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 14,
                        ),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Select Mentor Section ─────────────────────────────
                  const Text(
                    'Select Doubt Mentor / Teacher',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  teachersAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    error: (error, stack) => Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Assigned doubt mentor will resolve your doubt.',
                        style: TextStyle(fontSize: 12, color: AppColors.error),
                      ),
                    ),
                    data: (teachers) {
                      if (teachers.isEmpty) {
                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.info_outline_rounded,
                                color: AppColors.textSecondary,
                                size: 20,
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Your doubt will be routed directly to the institute head mentor.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }

                      // Auto-select first mentor if none selected
                      if (_selectedTeacherId == null && teachers.isNotEmpty) {
                        _selectedTeacherId = teachers.first['id'] as int?;
                      }

                      return Column(
                        children: teachers.map<Widget>((t) {
                          final id = t['id'] as int?;
                          final name = t['name'] as String? ?? 'Teacher';
                          final subject = t['subject'] as String? ?? 'Mentor';
                          final role = t['role'] as String? ?? '';
                          final isSelected = _selectedTeacherId == id;

                          return GestureDetector(
                            onTap: () {
                              setState(() => _selectedTeacherId = id);
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primary.withValues(alpha: 0.08)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : AppColors.borderLight,
                                  width: isSelected ? 1.8 : 1,
                                ),
                                boxShadow: isSelected
                                    ? [
                                        BoxShadow(
                                          color: AppColors.primary
                                              .withValues(alpha: 0.12),
                                          blurRadius: 8,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: isSelected
                                        ? AppColors.primary
                                        : AppColors.background,
                                    child: Text(
                                      name.isNotEmpty
                                          ? name[0].toUpperCase()
                                          : 'M',
                                      style: TextStyle(
                                        color: isSelected
                                            ? Colors.white
                                            : AppColors.textSecondary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Flexible(
                                              child: Text(
                                                name,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 14,
                                                  color: AppColors.primaryDark,
                                                ),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            if (role == 'coaching_admin') ...[
                                              const SizedBox(width: 6),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 6,
                                                  vertical: 2,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary
                                                      .withValues(alpha: 0.12),
                                                  borderRadius:
                                                      BorderRadius.circular(6),
                                                ),
                                                child: const Text(
                                                  'Assigned',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppColors.primary,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '$subject • ${role == "coaching_admin" ? "Head / Mentor" : "Teacher"}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    isSelected
                                        ? Icons.check_circle_rounded
                                        : Icons.radio_button_unchecked_rounded,
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.borderMedium,
                                    size: 22,
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                  const SizedBox(height: 12),

                  // ── Info Tip Box ──────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          color: AppColors.primary,
                          size: 18,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Clicking below will open WhatsApp with your student name and doubt details pre-filled. You can also attach photos of your question directly in WhatsApp.',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: AppColors.primaryDark,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // ── Action Button ─────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 4,
                  shadowColor: AppColors.primary.withValues(alpha: 0.35),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.send_rounded,
                            size: 20,
                            color: Colors.white,
                          ),
                          SizedBox(width: 10),
                          Text(
                            'Send Doubt on WhatsApp',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
