import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// Live "X Present · Y Absent · Z Late" tally shown once at least one
/// student has been marked, so the teacher sees progress without
/// scrolling the whole list.
class AttendanceSummaryBar extends StatelessWidget {
  final int present;
  final int absent;
  final int late;

  const AttendanceSummaryBar({
    super.key,
    required this.present,
    required this.absent,
    required this.late,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _Dot(color: AppColors.success, label: '$present Present'),
        const SizedBox(width: 14),
        _Dot(color: AppColors.error, label: '$absent Absent'),
        const SizedBox(width: 14),
        _Dot(color: AppColors.warning, label: '$late Late'),
      ],
    );
  }
}

class _Dot extends StatelessWidget {
  final Color color;
  final String label;
  const _Dot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF56655B)),
        ),
      ],
    );
  }
}
