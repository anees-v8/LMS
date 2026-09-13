import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';
import '../management/teacher_attendance_screen.dart';
import '../management/teacher_student_reports_screen.dart';

class TeacherBatchesScreen extends ConsumerWidget {
  const TeacherBatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final batchesAsync = ref.watch(myBatchesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'My Batches',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        automaticallyImplyLeading: false, // No hamburger menu
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            color: AppColors.primaryDark,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search batches...',
                hintStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6),
                ),
                prefixIcon: const Icon(Icons.search, color: Colors.white70),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.15),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              style: const TextStyle(color: Colors.white),
            ),
          ),

          // Batches List
          Expanded(
            child: batchesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) =>
                  Center(child: Text(friendlyErrorMessage(err))),
              data: (batches) {
                if (batches.isEmpty) {
                  return const Center(
                    child: Text(
                      'You are not assigned to any batches yet.',
                      style: TextStyle(color: Colors.grey),
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: batches.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final batch = batches[index];
                    return _buildBatchCard(context, batch);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBatchCard(BuildContext context, dynamic batch) {
    // Mocking some stats since the API only returns id and name for now
    // In a real scenario, these would come from the backend.
    final studentCount =
        (batch['id'] * 12 + 15); // Just a mock formula for distinct numbers
    final subject = batch['subject'] ?? 'General Subjects';
    final scheduleStr = batch['schedule'] ?? 'Mon - Fri | 09:00 AM';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        batch['name'] ?? 'Unknown Batch',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: AppColors.primaryDark,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'ID: ${batch['id']}',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {}, // e.g. open more options menu
                  icon: const Icon(Icons.more_vert, color: Colors.grey),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Stats & Info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.people, size: 16, color: Colors.blue.shade400),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$studentCount Students',
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ),

                    Icon(
                      Icons.menu_book,
                      size: 16,
                      color: Colors.green.shade400,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        subject,
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 16,
                      color: Colors.orange.shade400,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      scheduleStr,
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Action Buttons
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(
                        color: AppColors.primary.withValues(alpha: 0.5),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: () {
                      // Navigate to Student Reports (which requires batch selection or we can pass batchId if we modify it)
                      // For now we just go to the screen that has the dropdown
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const TeacherStudentReportsScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.bar_chart, size: 16),
                    label: const Text('Reports'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => TeacherAttendanceScreen(
                            batchId: batch['id'],
                            batchName: batch['name'] ?? 'Batch',
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.how_to_reg, size: 16),
                    label: const Text('Attendance'),
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
