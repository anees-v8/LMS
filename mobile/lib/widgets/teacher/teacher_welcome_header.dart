import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'package:intl/intl.dart';
import '../../utils/greeting.dart';

class TeacherWelcomeHeader extends StatelessWidget {
  final String teacherName;
  final int classesToday;

  const TeacherWelcomeHeader({
    super.key,
    required this.teacherName,
    required this.classesToday,
  });

  @override
  Widget build(BuildContext context) {
    final today = DateFormat('EEEE, dd MMM').format(DateTime.now());
    final greeting = timeBasedGreeting();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '👋 $greeting,\n$teacherName!',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.calendar_today_outlined,
                size: 16,
                color: Colors.grey,
              ),
              const SizedBox(width: 8),
              Text(
                today,
                style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
              ),
              const SizedBox(width: 16),
              const Icon(
                Icons.menu_book_outlined,
                size: 16,
                color: Colors.grey,
              ),
              const SizedBox(width: 8),
              Text(
                '$classesToday Classes Today',
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
