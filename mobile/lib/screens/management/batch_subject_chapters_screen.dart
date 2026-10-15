import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../widgets/action_menu_bottom_sheet.dart';

String _formatDate(String isoString) {
  final date = DateTime.tryParse(isoString);
  if (date == null) return '';
  return DateFormat('MMM d, yyyy').format(date.toLocal());
}

final batchSubjectChaptersProvider = FutureProvider.family<
  List<dynamic>,
  ({int batchId, int subjectId})
>((ref, params) async {
  final api = ref.read(apiServiceProvider);
  return await api.get(
    '/admin/batches/${params.batchId}/subjects/${params.subjectId}/chapters',
  );
});

class BatchSubjectChaptersScreen extends ConsumerStatefulWidget {
  final int batchId;
  final int subjectId;
  final String subjectName;

  const BatchSubjectChaptersScreen({
    super.key,
    required this.batchId,
    required this.subjectId,
    required this.subjectName,
  });

  @override
  ConsumerState<BatchSubjectChaptersScreen> createState() =>
      _BatchSubjectChaptersScreenState();
}

class _BatchSubjectChaptersScreenState
    extends ConsumerState<BatchSubjectChaptersScreen> {
  ({int batchId, int subjectId}) get _key =>
      (batchId: widget.batchId, subjectId: widget.subjectId);

  Future<void> _addChapter() async {
    final name = await _promptForName(context, title: 'Add Chapter');
    if (name == null || name.trim().isEmpty) return;
    try {
      final api = ref.read(apiServiceProvider);
      await api.post(
        '/admin/batches/${widget.batchId}/subjects/${widget.subjectId}/chapters',
        {'name': name.trim()},
      );
      ref.invalidate(batchSubjectChaptersProvider(_key));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(e))));
      }
    }
  }

  Future<void> _renameChapter(Map<String, dynamic> chapter) async {
    final name = await _promptForName(
      context,
      title: 'Rename Chapter',
      initialValue: chapter['name'] as String?,
    );
    if (name == null || name.trim().isEmpty) return;
    try {
      final api = ref.read(apiServiceProvider);
      await api.put(
        '/admin/batches/${widget.batchId}/subjects/${widget.subjectId}/chapters/${chapter['id']}',
        {'name': name.trim()},
      );
      ref.invalidate(batchSubjectChaptersProvider(_key));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(e))));
      }
    }
  }

  Future<void> _toggleComplete(Map<String, dynamic> chapter) async {
    final isCompleted = chapter['completedAt'] != null;
    try {
      final api = ref.read(apiServiceProvider);
      await api.patch(
        '/admin/batches/${widget.batchId}/subjects/${widget.subjectId}/chapters/${chapter['id']}/complete',
        {'completed': !isCompleted},
      );
      ref.invalidate(batchSubjectChaptersProvider(_key));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(e))));
      }
    }
  }

  Future<void> _removeChapter(Map<String, dynamic> chapter) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Chapter'),
        content: Text(
          'Remove "${chapter['name']}"? This only works if no content has been uploaded under it yet.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      final api = ref.read(apiServiceProvider);
      await api.delete(
        '/admin/batches/${widget.batchId}/subjects/${widget.subjectId}/chapters/${chapter['id']}',
      );
      ref.invalidate(batchSubjectChaptersProvider(_key));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(e))));
      }
    }
  }

  Future<String?> _promptForName(
    BuildContext context, {
    required String title,
    String? initialValue,
  }) {
    final controller = TextEditingController(text: initialValue ?? '');
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Chapter name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final chaptersAsync = ref.watch(batchSubjectChaptersProvider(_key));
    final screenWidth = MediaQuery.of(context).size.width;
    final bool isTablet = screenWidth >= 700;
    final double hPadding = screenWidth >= 900 ? 36 : (screenWidth >= 650 ? 28 : 16);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2E27),
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          '${widget.subjectName} Chapters',
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
      ),
      body: chaptersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text(friendlyErrorMessage(err))),
        data: (chapters) {
          if (chapters.isEmpty) {
            return const Center(
              child: Text(
                'No chapters yet. Tap + to add one.',
                style: TextStyle(color: Colors.grey),
              ),
            );
          }
          return isTablet
              ? GridView.builder(
                  padding: EdgeInsets.fromLTRB(hPadding, 20, hPadding, 160),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 14,
                    mainAxisExtent: 96,
                  ),
                  itemCount: chapters.length,
                  itemBuilder: (context, index) {
                    final chapter = chapters[index] as Map<String, dynamic>;
                    return _buildChapterCard(context, chapter, index);
                  },
                )
              : ListView.separated(
                  padding: EdgeInsets.fromLTRB(hPadding, 16, hPadding, 160),
                  itemCount: chapters.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final chapter = chapters[index] as Map<String, dynamic>;
                    return _buildChapterCard(context, chapter, index);
                  },
                );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        onPressed: _addChapter,
        backgroundColor: const Color(0xFF1F2E27),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Chapter', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Widget _buildChapterCard(
    BuildContext context,
    Map<String, dynamic> chapter,
    int index,
  ) {
    final isCompleted = chapter['completedAt'] != null;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isCompleted
            ? const Color(0xFF2E6656).withValues(alpha: 0.05)
            : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCompleted
              ? const Color(0xFF2E6656).withValues(alpha: 0.3)
              : Colors.grey.shade200,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: () => _toggleComplete(chapter),
            child: Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isCompleted
                    ? const Color(0xFF2E6656)
                    : Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: isCompleted
                  ? const Icon(Icons.check, color: Colors.white, size: 22)
                  : Text(
                      '${chapter['chapterNumber'] ?? index + 1}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Colors.orange,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Chapter ${chapter['chapterNumber'] ?? index + 1}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade500,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  chapter['name'] ?? 'Untitled Chapter',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF1F2E27),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (isCompleted) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Completed by ${chapter['completedByName'] ?? 'someone'} · '
                    '${_formatDate(chapter['completedAt'] as String)}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF2E6656),
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.more_vert, color: Colors.grey.shade600),
            onPressed: () async {
              final action = await showActionMenuBottomSheet(
                context,
                title: chapter['name'] ?? 'Chapter',
                options: [
                  ActionMenuOption(
                    icon: isCompleted
                        ? Icons.replay_outlined
                        : Icons.check_circle_outline,
                    label: isCompleted ? 'Mark Incomplete' : 'Mark Complete',
                    value: 'toggle_complete',
                    color: isCompleted ? null : const Color(0xFF2E6656),
                  ),
                  const ActionMenuOption(
                    icon: Icons.edit_outlined,
                    label: 'Rename',
                    value: 'rename',
                  ),
                  const ActionMenuOption(
                    icon: Icons.delete_outline,
                    label: 'Remove',
                    value: 'remove',
                    color: Colors.red,
                  ),
                ],
              );
              if (!context.mounted) return;
              if (action == 'toggle_complete') {
                _toggleComplete(chapter);
              } else if (action == 'rename') {
                _renameChapter(chapter);
              } else if (action == 'remove') {
                _removeChapter(chapter);
              }
            },
          ),
        ],
      ),
    );
  }
}
