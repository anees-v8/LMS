import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/receipt_service.dart';
import '../../theme/app_colors.dart';

class ReceiptScreen extends StatelessWidget {
  final String tenantName;
  final String studentName;
  final String rollNo;
  final String grade;
  final Map<String, dynamic> paymentData;
  final num? pendingBalance;

  const ReceiptScreen({
    super.key,
    required this.tenantName,
    required this.studentName,
    required this.rollNo,
    required this.grade,
    required this.paymentData,
    this.pendingBalance,
  });

  Future<void> _printReceipt(BuildContext context) async {
    await ReceiptService.downloadStudentFeeReceipt(
      context: context,
      instituteName: tenantName,
      studentName: studentName,
      rollNo: rollNo,
      gradeOrBatch: grade,
      receiptNo: paymentData['receiptNo']?.toString() ?? 'REC-${DateTime.now().millisecondsSinceEpoch}',
      amount: paymentData['amount'] ?? 0,
      date: paymentData['date']?.toString() ?? DateTime.now().toIso8601String(),
      paymentMethod: paymentData['method']?.toString(),
      description: paymentData['desc']?.toString() ?? paymentData['description']?.toString(),
      pendingBalance: pendingBalance,
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = paymentData['date'] != null
        ? DateFormat(
            'dd MMM yyyy, hh:mm a',
          ).format(DateTime.parse(paymentData['date'].toString()))
        : 'N/A';

    final displayGrade = grade.toLowerCase().startsWith('class')
        ? grade
        : 'Class $grade';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Fee Receipt',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded, color: Colors.white),
            onPressed: () => _printReceipt(context),
            tooltip: 'Download PDF',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Receipt Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: Color(0xFFE8F0EA),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.receipt_long,
                            color: Color(0xFF2E6656),
                            size: 32,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          tenantName.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2E27),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'FEE RECEIPT',
                          style: TextStyle(
                            color: Colors.grey,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Divider(color: Color(0xFFE0E0E0)),
                  const SizedBox(height: 16),
                  _buildDetailRow(
                    'Receipt No',
                    paymentData['receiptNo']?.toString() ?? 'N/A',
                  ),
                  const SizedBox(height: 12),
                  _buildDetailRow('Date', dateStr),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE0E0E0)),
                  const SizedBox(height: 16),
                  const Text(
                    'STUDENT DETAILS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    studentName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$displayGrade • Roll No. $rollNo',
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'PAYMENT DETAILS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildDetailRow(
                    'Description',
                    paymentData['desc']?.toString() ?? 'Fee Payment',
                  ),
                  const SizedBox(height: 12),
                  _buildDetailRow(
                    'Payment Method',
                    paymentData['method']?.toString().toUpperCase() ?? 'N/A',
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE0E0E0)),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Amount',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '₹${paymentData['amount'] ?? 0}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2E6656),
                        ),
                      ),
                    ],
                  ),
                  if (pendingBalance != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Remaining Due',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                        Text(
                          pendingBalance! > 0 ? '₹$pendingBalance' : '₹0 (Cleared)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: pendingBalance! > 0 ? const Color(0xFFC0392B) : const Color(0xFF2E6656),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 32),
                  const Center(
                    child: Text(
                      'Thank you!',
                      style: TextStyle(
                        fontStyle: FontStyle.italic,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            // Bottom Action Button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _printReceipt(context),
                icon: const Icon(Icons.download),
                label: const Text('Download / Print PDF'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2E6656),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
