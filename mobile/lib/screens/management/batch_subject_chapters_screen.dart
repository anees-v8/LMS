import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../widgets/action_menu_bottom_sheet.dart';

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
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 160),
            itemCount: chapters.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final chapter = chapters[index] as Map<String, dynamic>;
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${chapter['chapterNumber'] ?? index + 1}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: Colors.orange,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
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
                              fontSize: 16,
                              color: Color(0xFF1F2E27),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.more_vert, color: Colors.grey.shade600),
                      onPressed: () async {
                        final action = await showActionMenuBottomSheet(
                          context,
                          title: chapter['name'] ?? 'Chapter',
                          options: const [
                            ActionMenuOption(
                              icon: Icons.edit_outlined,
                              label: 'Rename',
                              value: 'rename',
                            ),
                            ActionMenuOption(
                              icon: Icons.delete_outline,
                              label: 'Remove',
                              value: 'remove',
                              color: Colors.red,
                            ),
                          ],
                        );
                        if (!context.mounted) return;
                        if (action == 'rename') {
                          _renameChapter(chapter);
                        } else if (action == 'remove') {
                          _removeChapter(chapter);
                        }
                      },
                    ),
                  ],
                ),
              );
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
}
