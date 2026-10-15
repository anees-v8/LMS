import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_textfield.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/action_menu_bottom_sheet.dart';

class SubjectsScreen extends ConsumerWidget {
  const SubjectsScreen({super.key});

  void _showAddSubjectBottomSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddSubjectBottomSheet(),
    );
  }

  void _showEditSubjectBottomSheet(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> subject,
  ) {
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddSubjectBottomSheet(subject: subject),
    );
  }

  Future<void> _deleteSubject(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> subject,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Subject'),
        content: Text(
          'Are you sure you want to delete ${subject['name']}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final result = await deleteSubject(ref.read(apiServiceProvider), subject['id']);
      ref.invalidate(subjectsProvider);
      if (context.mounted) {
        final softDeleted = result['softDeleted'] == true;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              softDeleted
                  ? 'Subject archived — it still has content, tests, or a schedule attached to it.'
                  : 'Subject deleted successfully',
            ),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(friendlyErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subjectsAsync = ref.watch(subjectsProvider);
    final screenWidth = MediaQuery.of(context).size.width;
    final bool isTablet = screenWidth >= 700;
    final double hPadding = screenWidth >= 900 ? 36.0 : (screenWidth >= 650 ? 32.0 : 16.0);

    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fixed Green Header
            Padding(
              padding: EdgeInsets.only(
                left: hPadding,
                right: hPadding,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Subjects',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage subjects taught at your institute',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // White Container with fixed parts and scrollable list
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: subjectsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (subjects) {
                    if (subjects.isEmpty) {
                      return const Center(child: Text('No subjects found.'));
                    }

                    Widget buildSubjectItem(int index) {
                      final subject = subjects[index] as Map<String, dynamic>;
                      return Card(
                        margin: EdgeInsets.only(bottom: isTablet ? 0 : 12),
                        color: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        child: Center(
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 4,
                            ),
                            leading: CircleAvatar(
                              backgroundColor: Colors.blue.shade50,
                              child: Icon(
                                Icons.menu_book,
                                color: Colors.blue.shade700,
                              ),
                            ),
                            title: Text(
                              subject['name'] ?? 'Unknown Subject',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2E27),
                              ),
                            ),
                            trailing: IconButton(
                              icon: Icon(
                                Icons.more_vert,
                                color: Colors.grey.shade600,
                              ),
                              onPressed: () async {
                                final action = await showActionMenuBottomSheet(
                                  context,
                                  title: subject['name'] ?? 'Subject',
                                  options: const [
                                    ActionMenuOption(
                                      icon: Icons.edit_outlined,
                                      label: 'Edit',
                                      value: 'edit',
                                    ),
                                    ActionMenuOption(
                                      icon: Icons.delete_outline,
                                      label: 'Delete',
                                      value: 'delete',
                                      color: Colors.red,
                                    ),
                                  ],
                                );
                                if (!context.mounted) return;
                                if (action == 'edit') {
                                  _showEditSubjectBottomSheet(
                                    context,
                                    ref,
                                    subject,
                                  );
                                } else if (action == 'delete') {
                                  _deleteSubject(context, ref, subject);
                                }
                              },
                            ),
                          ),
                        ),
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(subjectsProvider),
                      child: isTablet
                          ? GridView.builder(
                              padding: EdgeInsets.fromLTRB(hPadding, 16, hPadding, 160),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 16,
                                mainAxisSpacing: 12,
                                mainAxisExtent: 76,
                              ),
                              itemCount: subjects.length,
                              itemBuilder: (context, index) => buildSubjectItem(index),
                            )
                          : ListView.builder(
                              padding: EdgeInsets.fromLTRB(hPadding, 16, hPadding, 160),
                              itemCount: subjects.length,
                              itemBuilder: (context, index) => buildSubjectItem(index),
                            ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        backgroundColor: const Color(0xFF2E6656),
        onPressed: () => _showAddSubjectBottomSheet(context, ref),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

class _AddSubjectBottomSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic>? subject;

  const _AddSubjectBottomSheet({this.subject});

  @override
  ConsumerState<_AddSubjectBottomSheet> createState() =>
      _AddSubjectBottomSheetState();
}

class _AddSubjectBottomSheetState
    extends ConsumerState<_AddSubjectBottomSheet> {
  final _name = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.subject != null) {
      _name.text = widget.subject!['name'] ?? '';
    }
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Subject name is required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.subject != null) {
        await updateSubject(
          ref.read(apiServiceProvider),
          widget.subject!['id'],
          name: _name.text.trim(),
        );
      } else {
        await createSubject(
          ref.read(apiServiceProvider),
          name: _name.text.trim(),
        );
      }
      ref.invalidate(subjectsProvider);
      if (mounted) {
        final nav = Navigator.of(context, rootNavigator: true);
        if (nav.canPop()) nav.pop();
      }
    } catch (e) {
      setState(() {
        _saving = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 540,
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
          // Drag handle — consistent with every other bottom sheet in the app.
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              height: 4,
              width: 40,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.subject != null ? 'Edit Subject' : 'Add New Subject',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () {
                    final nav = Navigator.of(context, rootNavigator: true);
                    if (nav.canPop()) nav.pop();
                  },
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CustomTextField(
                    label: 'Subject Name',
                    hint: 'e.g. Mathematics',
                    controller: _name,
                    prefixIcon: Icons.menu_book,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: Colors.red,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: Colors.red,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: Colors.grey.shade100, width: 1),
              ),
            ),
            child: _saving
                ? const Center(child: CircularProgressIndicator())
                : SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: CustomButton(
                      text: widget.subject != null
                          ? 'Update Subject'
                          : 'Save Subject',
                      onPressed: _saving ? () {} : () => _submit(),
                    ),
                  ),
          ),
        ],
      ),
    ),
  ),
),
),
);
  }
}
