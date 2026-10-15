import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'batch_subject_chapters_screen.dart';

/// Chapters live per (batch, subject) — a subject like "Maths" is a
/// tenant-wide tag reused across unrelated batches/grades (Class 5 Maths
/// and Class 10 Maths have unrelated curricula despite sharing a name),
/// so chapter management starts from a specific batch's subject list,
/// never a bare subject picker.
class BatchSubjectsScreen extends ConsumerWidget {
  final int batchId;
  final String batchName;
  final List<dynamic> subjects; // [{id, name}, ...] from the batch object

  const BatchSubjectsScreen({
    super.key,
    required this.batchId,
    required this.batchName,
    required this.subjects,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final screenWidth = MediaQuery.of(context).size.width;
    final bool isTablet = screenWidth >= 700;
    final double hPadding = screenWidth >= 900 ? 36 : (screenWidth >= 650 ? 28 : 16);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F3),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2E27),
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          '$batchName — Chapters',
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
      ),
      body: subjects.isEmpty
          ? const Center(
              child: Text(
                'No subjects assigned to this batch yet.',
                style: TextStyle(color: Colors.grey),
              ),
            )
          : isTablet
              ? GridView.builder(
                  padding: EdgeInsets.fromLTRB(hPadding, 20, hPadding, 40),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 14,
                    mainAxisExtent: 80,
                  ),
                  itemCount: subjects.length,
                  itemBuilder: (context, index) {
                    final subject = subjects[index] as Map<String, dynamic>;
                    return _buildSubjectCard(context, subject);
                  },
                )
              : ListView.separated(
                  padding: EdgeInsets.fromLTRB(hPadding, 16, hPadding, 40),
                  itemCount: subjects.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final subject = subjects[index] as Map<String, dynamic>;
                    return _buildSubjectCard(context, subject);
                  },
                ),
    );
  }

  Widget _buildSubjectCard(BuildContext context, Map<String, dynamic> subject) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BatchSubjectChaptersScreen(
                  batchId: batchId,
                  subjectId: subject['id'],
                  subjectName: subject['name'] ?? 'Subject',
                ),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.menu_book,
                    color: Colors.blue.shade700,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    subject['name'] ?? 'Untitled Subject',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
