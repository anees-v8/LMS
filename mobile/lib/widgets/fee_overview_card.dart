import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:intl/intl.dart';

class FeeOverviewCard extends StatelessWidget {
  final num total;
  final num paid;
  final num pending;
  final String? lastPaymentDate;
  final num? lastPaymentAmount;
  final String? nextDueDate;

  const FeeOverviewCard({
    super.key,
    required this.total,
    required this.paid,
    required this.pending,
    this.lastPaymentDate,
    this.lastPaymentAmount,
    this.nextDueDate,
  });

  @override
  Widget build(BuildContext context) {
    final pctPaid = total > 0 ? (paid / total) : 0.0;

    // Calculate days left
    String daysLeftText = '';
    if (nextDueDate != null) {
      final dueDate = DateTime.tryParse(nextDueDate!);
      if (dueDate != null) {
        final now = DateTime.now();
        final diff = dueDate.difference(now).inDays;
        if (diff > 0) {
          daysLeftText = 'In $diff Days';
        } else if (diff == 0) {
          daysLeftText = 'Today';
        } else {
          daysLeftText = 'Overdue by ${diff.abs()} Days';
        }
      }
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Fee Overview',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildAmtCol('Total Fees', '₹$total', Colors.black87),
                        _buildAmtCol('Paid', '₹$paid', AppColors.success),
                        _buildAmtCol('Pending', '₹$pending', AppColors.error),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: pctPaid,
                              backgroundColor: Colors.grey.shade200,
                              color: AppColors.primaryDark,
                              minHeight: 8,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${(pctPaid * 100).toInt()}% Paid',
                          style: const TextStyle(
                            color: AppColors.success,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              // Circular Indicator
              SizedBox(
                width: 100,
                height: 100,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: pctPaid,
                      strokeWidth: 8,
                      backgroundColor: Colors.grey.shade200,
                      color: AppColors.success,
                    ),
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.account_balance_wallet,
                            color: AppColors.primaryDark,
                            size: 24,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '₹$pending',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          const Text(
                            'Pending',
                            style: TextStyle(fontSize: 10, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildInfoCard(
                  Icons.calendar_today_outlined,
                  'Last Payment',
                  lastPaymentDate != null
                      ? _formatDate(lastPaymentDate!)
                      : 'N/A',
                  subtitle: lastPaymentAmount != null
                      ? '₹$lastPaymentAmount'
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildInfoCard(
                  Icons.event_note_outlined,
                  'Next Due',
                  nextDueDate != null ? _formatDate(nextDueDate!) : 'N/A',
                  pill: daysLeftText.isNotEmpty ? daysLeftText : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAmtCol(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(
    IconData icon,
    String title,
    String value, {
    String? subtitle,
    String? pill,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryDark, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 12)),
                ],
                if (pill != null) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      pill,
                      style: TextStyle(
                        color: Colors.orange.shade800,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final d = DateTime.parse(isoString);
      return DateFormat('dd MMM yyyy').format(d);
    } catch (e) {
      return isoString.split('T').first;
    }
  }
}
