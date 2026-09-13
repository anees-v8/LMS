import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// The P / A / L tap-to-select status button used on the attendance
/// marking list — one instance per status per student row.
class AttendanceStatusButton extends StatelessWidget {
  final String label;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const AttendanceStatusButton({
    super.key,
    required this.label,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.grey.shade600,
          ),
        ),
      ),
    );
  }
}

/// The full P/A/L trio for one student row.
class AttendanceStatusButtonRow extends StatelessWidget {
  final String? status;
  final ValueChanged<String> onChanged;

  const AttendanceStatusButtonRow({
    super.key,
    required this.status,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AttendanceStatusButton(
          label: 'P',
          color: AppColors.success,
          isSelected: status == 'present',
          onTap: () => onChanged('present'),
        ),
        const SizedBox(width: 8),
        AttendanceStatusButton(
          label: 'A',
          color: AppColors.error,
          isSelected: status == 'absent',
          onTap: () => onChanged('absent'),
        ),
        const SizedBox(width: 8),
        AttendanceStatusButton(
          label: 'L',
          color: AppColors.warning,
          isSelected: status == 'late',
          onTap: () => onChanged('late'),
        ),
      ],
    );
  }
}
