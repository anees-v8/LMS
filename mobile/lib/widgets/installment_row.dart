import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:intl/intl.dart';

class InstallmentRow extends StatelessWidget {
  final int index;
  final String title;
  final num amount;
  final String status;
  final String? dueDate;

  const InstallmentRow({
    super.key,
    required this.index,
    required this.title,
    required this.amount,
    required this.status,
    this.dueDate,
  });

  @override
  Widget build(BuildContext context) {
    final isPaid = status == 'Paid';
    final isPending = status == 'Pending';
    final isOverdue = status == 'Overdue';

    Color statusColor = Colors.grey;
    IconData statusIcon = Icons.circle_outlined;
    Color bgColor = Colors.transparent;

    if (isPaid) {
      statusColor = AppColors.success;
      statusIcon = Icons.check_circle;
    } else if (isOverdue) {
      statusColor = AppColors.error;
      statusIcon = Icons.cancel;
      bgColor = Colors.red.shade50;
    } else if (isPending) {
      statusColor = Colors.orange;
      statusIcon = Icons.access_time_filled;
      bgColor = Colors.orange.shade50;
    } else {
      // Upcoming
      statusColor = Colors.grey;
      statusIcon = Icons.circle;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          if (isUpcomingStatus(status))
            Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                shape: BoxShape.circle,
              ),
              child: Text(
                '$index',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          else
            Icon(statusIcon, color: statusColor, size: 24),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  dueDate != null
                      ? 'Due: ${_formatDate(dueDate!)}'
                      : 'No due date',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹$amount',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                status,
                style: TextStyle(
                  color: statusColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Text(
            dueDate != null ? _formatDate(dueDate!, short: true) : '-',
            style: const TextStyle(color: Colors.grey, fontSize: 12),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
        ],
      ),
    );
  }

  bool isUpcomingStatus(String status) => status == 'Upcoming';

  String _formatDate(String isoString, {bool short = false}) {
    try {
      final d = DateTime.parse(isoString);
      return DateFormat(short ? 'dd MMM yyyy' : 'dd MMM yyyy').format(d);
    } catch (e) {
      return isoString.split('T').first;
    }
  }
}
