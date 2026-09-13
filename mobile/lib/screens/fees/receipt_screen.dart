import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

class ReceiptScreen extends StatelessWidget {
  final String tenantName;
  final String studentName;
  final String rollNo;
  final String grade;
  final Map<String, dynamic> paymentData;

  const ReceiptScreen({
    super.key,
    required this.tenantName,
    required this.studentName,
    required this.rollNo,
    required this.grade,
    required this.paymentData,
  });

  Future<void> _printReceipt(BuildContext context) async {
    final pdf = pw.Document();

    final dateStr = paymentData['date'] != null
        ? DateFormat(
            'dd MMM yyyy, hh:mm a',
          ).format(DateTime.parse(paymentData['date'].toString()))
        : 'N/A';

    final displayGrade = grade.toLowerCase().startsWith('class')
        ? grade
        : 'Class $grade';

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.all(32),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Center(
                  child: pw.Text(
                    tenantName.toUpperCase(),
                    style: pw.TextStyle(
                      fontSize: 24,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
                pw.SizedBox(height: 8),
                pw.Center(
                  child: pw.Text(
                    'FEE RECEIPT',
                    style: pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.grey700,
                    ),
                  ),
                ),
                pw.SizedBox(height: 24),
                pw.Divider(),
                pw.SizedBox(height: 12),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Receipt No: ${paymentData['receiptNo'] ?? 'N/A'}'),
                    pw.Text('Date: $dateStr'),
                  ],
                ),
                pw.SizedBox(height: 12),
                pw.Divider(),
                pw.SizedBox(height: 24),
                pw.Text(
                  'Student Details',
                  style: pw.TextStyle(
                    fontSize: 16,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 8),
                pw.Text('Name: $studentName'),
                pw.Text('$displayGrade - Roll No. $rollNo'),
                pw.SizedBox(height: 24),
                pw.Text(
                  'Payment Details',
                  style: pw.TextStyle(
                    fontSize: 16,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 8),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Description:',
                      style: pw.TextStyle(color: PdfColors.grey700),
                    ),
                    pw.Text(paymentData['desc']?.toString() ?? 'Fee Payment'),
                  ],
                ),
                pw.SizedBox(height: 8),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Payment Method:',
                      style: pw.TextStyle(color: PdfColors.grey700),
                    ),
                    pw.Text(
                      paymentData['method']?.toString().toUpperCase() ?? 'N/A',
                    ),
                  ],
                ),
                pw.SizedBox(height: 12),
                pw.Divider(),
                pw.SizedBox(height: 12),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      'Amount Paid:',
                      style: pw.TextStyle(
                        fontSize: 18,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Text(
                      'Rs. ${paymentData['amount'] ?? 0}',
                      style: pw.TextStyle(
                        fontSize: 18,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                pw.SizedBox(height: 12),
                pw.Divider(),
                pw.Spacer(),
                pw.Center(
                  child: pw.Text(
                    'Thank you for the payment!',
                    style: pw.TextStyle(fontStyle: pw.FontStyle.italic),
                  ),
                ),
                pw.SizedBox(height: 32),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      '_____________________\nAuthorized Signatory',
                      textAlign: pw.TextAlign.center,
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Receipt_${paymentData['receiptNo'] ?? 'Fee'}',
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
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2E27),
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Fee Receipt', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
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
