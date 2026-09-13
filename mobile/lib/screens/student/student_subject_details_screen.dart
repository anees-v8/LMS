import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import 'student_chapter_content_screen.dart';

class StudentSubjectDetailsScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> subject;
  const StudentSubjectDetailsScreen({super.key, required this.subject});

  @override
  ConsumerState<StudentSubjectDetailsScreen> createState() =>
      _StudentSubjectDetailsScreenState();
}

class _StudentSubjectDetailsScreenState
    extends ConsumerState<StudentSubjectDetailsScreen> {
  @override
  Widget build(BuildContext context) {
    final subjectName = widget.subject['name'] as String? ?? 'Subject';
    final progress = (widget.subject['progress'] as num?)?.toDouble() ?? 0.0;

    final id = widget.subject['id'] as int? ?? 0;
    final colors = [
      const Color(0xFF3F88C5),
      const Color(0xFF2E6656),
      const Color(0xFF9C4E97),
      const Color(0xFF4CAF50),
      const Color(0xFFA87D26),
      const Color(0xFFE53935),
    ];
    final color = colors[id % colors.length];

    final chaptersAsync = ref.watch(studentChaptersProvider(id));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.primaryDark,
            expandedHeight: 160,
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.fromLTRB(20, 0, 20, 56),
              title: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subjectName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      SizedBox(
                        width: 100,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: progress,
                            backgroundColor: Colors.white.withValues(
                              alpha: 0.2,
                            ),
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              Color(0xFFA87D26),
                            ),
                            minHeight: 4,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${(progress * 100).toInt()}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primaryDark,
                      color.withValues(alpha: 0.8),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
        body: chaptersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Text(
              friendlyErrorMessage(e),
              style: const TextStyle(color: Colors.grey),
            ),
          ),
          data: (chapters) {
            if (chapters.isEmpty) {
              return const Center(
                child: Text(
                  'No chapters found',
                  style: TextStyle(color: Colors.grey),
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: chapters.length,
              separatorBuilder: (_, i) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final ch = chapters[index];
                return _ChapterTile(
                  chapter: ch,
                  index: index,
                  color: color,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => StudentChapterContentScreen(
                        chapter: ch,
                        subjectName: subjectName,
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _ChapterTile extends StatelessWidget {
  final Map<String, dynamic> chapter;
  final int index;
  final Color color;
  final VoidCallback onTap;

  const _ChapterTile({
    required this.chapter,
    required this.index,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isCompleted = chapter['isCompleted'] == true;
    final title =
        chapter['title'] as String? ??
        (chapter['name'] as String? ?? 'Chapter');
    final itemsCount = chapter['itemsCount'] as int? ?? 0;
    final totalDuration = chapter['totalDurationMinutes'] as int? ?? 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isCompleted
                ? AppColors.success.withValues(alpha: 0.3)
                : Colors.grey.shade100,
          ),
        ),
        child: Row(
          children: [
            // Chapter number circle
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isCompleted
                    ? AppColors.successLight
                    : color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: isCompleted
                  ? const Icon(
                      Icons.check_rounded,
                      color: AppColors.success,
                      size: 20,
                    )
                  : Center(
                      child: Text(
                        '${index + 1}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: color,
                          fontSize: 14,
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Chapter ${index + 1}: $title',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: isCompleted ? Colors.grey : AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(
                        Icons.play_circle_outline_rounded,
                        size: 14,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$itemsCount items',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Icon(
                        Icons.timer_outlined,
                        size: 14,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$totalDuration min',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 14,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }
}
