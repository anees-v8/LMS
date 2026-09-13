import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class ProfileInfoRowData {
  final IconData icon;
  final String label;
  final String value;
  const ProfileInfoRowData({
    required this.icon,
    required this.label,
    required this.value,
  });
}

/// White "Personal Details" card — shared shell, rows supplied per role.
class ProfileInfoCard extends StatelessWidget {
  final List<ProfileInfoRowData> rows;
  final String title;
  const ProfileInfoCard({
    super.key,
    required this.rows,
    this.title = 'Personal Details',
  });

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) const Divider(height: 20),
            _InfoRow(data: rows[i]),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final ProfileInfoRowData data;
  const _InfoRow({required this.data});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(data.icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                data.label,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              Text(
                data.value,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
