import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'package:intl/intl.dart';

class PaymentHistoryRow extends StatelessWidget {
  final String date;
  final String amount;
  final String method;
  final String receiptNo;

  const PaymentHistoryRow({
    super.key,
    required this.date,
    required this.amount,
    required this.method,
    required this.receiptNo,
  });

  @override
  Widget build(BuildContext context) {
    Color methodBgColor = Colors.grey.shade100;
    Color methodTextColor = Colors.grey.shade700;
    IconData leadingIcon = Icons.payments_outlined;
    Color leadingColor = Colors.grey;

    if (method.toLowerCase() == 'online') {
      methodBgColor = Colors.green.shade50;
      methodTextColor = AppColors.success;
      leadingIcon = Icons.credit_card;
      leadingColor = AppColors.success;
    } else if (method.toLowerCase() == 'upi') {
      methodBgColor = Colors.purple.shade50;
      methodTextColor = Colors.purple;
      leadingIcon = Icons.qr_code_scanner;
      leadingColor = Colors.purple;
    } else if (method.toLowerCase() == 'cash') {
      methodBgColor = Colors.orange.shade50;
      methodTextColor = Colors.orange.shade800;
      leadingIcon = Icons.money;
      leadingColor = Colors.orange;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: leadingColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(leadingIcon, color: leadingColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatDate(date),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Receipt #$receiptNo',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ),
          Text(
            '₹$amount',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(width: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: methodBgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              method.toUpperCase(),
              style: TextStyle(
                color: methodTextColor,
                fontWeight: FontWeight.bold,
                fontSize: 10,
              ),
            ),
          ),
          const SizedBox(width: 16),
          const Icon(Icons.download_outlined, color: Colors.grey, size: 20),
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
