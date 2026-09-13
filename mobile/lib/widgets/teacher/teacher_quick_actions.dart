import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

import '../../screens/management/teacher_mark_attendance_select_batch.dart';
import '../../screens/management/teacher_subjects_screen.dart';
import '../../screens/management/teacher_manage_tests_screen.dart';
import '../../screens/management/teacher_student_reports_screen.dart';

class TeacherQuickActions extends StatelessWidget {
  const TeacherQuickActions({super.key});

  Widget _buildActionCard(
    BuildContext context,
    String title,
    IconData icon,
    Color color,
    Widget destination,
  ) {
    return InkWell(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => destination));
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: AppColors.primaryDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quick Actions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.1,
            children: [
              _buildActionCard(
                context,
                'Mark\nAttendance',
                Icons.how_to_reg,
                AppColors.primary,
                const TeacherMarkAttendanceSelectBatchScreen(),
              ),
              _buildActionCard(
                context,
                'Upload\nMaterial',
                Icons.upload_file,
                Colors.orange,
                const TeacherSubjectsScreen(),
              ),
              _buildActionCard(
                context,
                'Manage\nTests',
                Icons.quiz,
                Colors.purple,
                const TeacherManageTestsScreen(),
              ),
              _buildActionCard(
                context,
                'Student\nReports',
                Icons.bar_chart,
                Colors.green,
                const TeacherStudentReportsScreen(),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
