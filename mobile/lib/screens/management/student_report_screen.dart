import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class StudentReportScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> student;

  /// Caller-supplied so this screen stays reusable across roles — admin
  /// watches `mgmt.studentDetailsProvider`, teacher watches
  /// `teacherStudentDetailsProvider` (same report shape, different
  /// ownership-scoped backend route). This screen just renders it.
  final AsyncValue<Map<String, dynamic>> detailsAsync;

  const StudentReportScreen({
    super.key,
    required this.student,
    required this.detailsAsync,
  });

  @override
  ConsumerState<StudentReportScreen> createState() =>
      _StudentReportScreenState();
}

class _StudentReportScreenState extends ConsumerState<StudentReportScreen> {
  // ──────────────────────────────────────── PDF ─────────────────────────────

  Future<void> _generatePdf(Map<String, dynamic> details, WidgetRef ref) async {
    final authState = ref.read(authProvider);

    // ── Load Fonts ──
    final fontRegular = await PdfGoogleFonts.notoSansRegular();
    final fontBold = await PdfGoogleFonts.notoSansBold();
    final fontItalic = await PdfGoogleFonts.notoSansItalic();

    // ── Theme Colours ──
    final cDark = PdfColor.fromHex('173A2D'); // Very Dark Green
    final cGreen = PdfColor.fromHex('2E6656'); // Primary Green
    final cBorder = PdfColor.fromHex('E0E0E0');
    final cTextMain = PdfColor.fromHex('333333');
    final cTextMuted = PdfColor.fromHex('666666');
    final cSuccess = PdfColor.fromHex('34A853'); // Green for positive
    final cError = PdfColor.fromHex('EA4335'); // Red for negative
    final cWarn = PdfColor.fromHex('FBBC05'); // Yellow

    pw.TextStyle ts(
      double size, {
      pw.Font? font,
      PdfColor? color,
      bool bold = false,
      bool italic = false,
    }) {
      return pw.TextStyle(
        font: font ?? (bold ? fontBold : (italic ? fontItalic : fontRegular)),
        fontSize: size,
        color: color ?? cTextMain,
      );
    }

    // ── Parse Data ──
    final fullName = widget.student['fullName']?.toString() ?? 'Unknown';
    final rollNo = widget.student['rollNo']?.toString() ?? 'N/A';
    final grade = widget.student['grade']?.toString() ?? 'N/A';
    final batchName = widget.student['batchName']?.toString() ?? 'N/A';
    final institute = (authState.instituteName?.isNotEmpty ?? false)
        ? authState.instituteName!
        : 'APEX ACADEMY';
    final currentYearStr =
        "${DateTime.now().year} - ${(DateTime.now().year + 1).toString().substring(2)}";

    final academics = details['academics'] as Map<String, dynamic>?;
    final overallPctStr = academics?['overallPercentage']?.toString() ?? '0.0';
    final subjects = (academics?['subjects'] as List<dynamic>?) ?? [];

    final att = details['attendance'] as Map<String, dynamic>?;
    final totalDays = int.tryParse(att?['totalDays']?.toString() ?? '0') ?? 0;
    final presentDays =
        int.tryParse(att?['presentDays']?.toString() ?? '0') ?? 0;
    final absentDays = int.tryParse(att?['absentDays']?.toString() ?? '0') ?? 0;
    final attPct = totalDays > 0 ? (presentDays / totalDays * 100) : 0.0;

    final fees = details['fees'] as Map<String, dynamic>?;
    final feeOv = fees?['overview'] as Map<String, dynamic>?;
    final totalFees = (feeOv?['total'] ?? 0) as num;
    final paidFees = (feeOv?['paid'] ?? 0) as num;
    final pendingFees = (feeOv?['pending'] ?? 0) as num;
    final nextDue = feeOv?['nextDue']?.toString();

    // ── Components ──
    pw.Widget sectionHeader(String title) {
      return pw.Container(
        width: double.infinity,
        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: pw.BoxDecoration(
          color: cDark,
          borderRadius: const pw.BorderRadius.only(
            topLeft: pw.Radius.circular(6),
            topRight: pw.Radius.circular(6),
          ),
        ),
        child: pw.Text(
          title,
          style: ts(10, bold: true, color: PdfColors.white),
        ),
      );
    }

    pw.Widget statCard(String title, String mainValue, String subText) {
      return pw.Expanded(
        child: pw.Container(
          margin: const pw.EdgeInsets.symmetric(horizontal: 4),
          padding: const pw.EdgeInsets.symmetric(vertical: 12),
          decoration: pw.BoxDecoration(
            color: PdfColors.white,
            border: pw.Border.all(color: cBorder),
            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
          ),
          child: pw.Column(
            mainAxisAlignment: pw.MainAxisAlignment.center,
            children: [
              pw.Text(
                title.toUpperCase(),
                style: ts(8, bold: true, color: cTextMuted),
              ),
              pw.SizedBox(height: 8),
              pw.Text(mainValue, style: ts(18, bold: true, color: cTextMain)),
              pw.SizedBox(height: 8),
              pw.Text(subText, style: ts(7, color: cTextMuted)),
              pw.Container(
                margin: const pw.EdgeInsets.only(top: 4),
                width: 16,
                height: 1,
                color: cBorder,
              ),
            ],
          ),
        ),
      );
    }

    pw.Widget dataRow(
      String label,
      String value, {
      bool isHeader = false,
      PdfColor? valueColor,
    }) {
      return pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: pw.BoxDecoration(
          border: pw.Border(bottom: pw.BorderSide(color: cBorder, width: 0.5)),
        ),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              label,
              style: ts(
                8.5,
                bold: isHeader,
                color: isHeader ? cTextMuted : cTextMain,
              ),
            ),
            pw.Text(
              value,
              style: ts(
                8.5,
                bold: isHeader,
                color: valueColor ?? (isHeader ? cTextMuted : cTextMain),
              ),
            ),
          ],
        ),
      );
    }

    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (ctx) => [
          // ── HEADER ──
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Row(
                children: [
                  pw.Container(
                    width: 40,
                    height: 40,
                    decoration: pw.BoxDecoration(
                      color: cDark,
                      shape: pw.BoxShape.circle,
                    ),
                    child: pw.Center(
                      child: pw.Text(
                        institute[0].toUpperCase(),
                        style: ts(20, bold: true, color: PdfColors.white),
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 12),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        institute.toUpperCase(),
                        style: ts(20, bold: true, color: cDark),
                      ),
                      pw.SizedBox(height: 2),
                      pw.Text(
                        'LEARN • GROW • ACHIEVE',
                        style: ts(8, color: cTextMuted, bold: true),
                      ),
                    ],
                  ),
                ],
              ),
              pw.Text(
                'STUDENT REPORT CARD',
                style: ts(14, bold: true, color: cDark),
              ),
            ],
          ),
          pw.SizedBox(height: 16),

          // ── INFO RIBBON ──
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(
              horizontal: 24,
              vertical: 12,
            ),
            decoration: pw.BoxDecoration(color: cDark),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Batch',
                      style: ts(8, color: const PdfColor(1, 1, 1, 0.7)),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      batchName,
                      style: ts(10, bold: true, color: PdfColors.white),
                    ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Academic Year',
                      style: ts(8, color: const PdfColor(1, 1, 1, 0.7)),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      currentYearStr,
                      style: ts(10, bold: true, color: PdfColors.white),
                    ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Generated On',
                      style: ts(8, color: const PdfColor(1, 1, 1, 0.7)),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      DateFormat('dd MMM yyyy').format(DateTime.now()),
                      style: ts(10, bold: true, color: PdfColors.white),
                    ),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 16),

          // ── STUDENT PROFILE BOX ──
          pw.Container(
            padding: const pw.EdgeInsets.all(16),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: cBorder),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
            ),
            child: pw.Row(
              children: [
                // Avatar
                pw.Container(
                  width: 60,
                  height: 60,
                  decoration: pw.BoxDecoration(
                    shape: pw.BoxShape.circle,
                    border: pw.Border.all(color: cGreen, width: 2),
                  ),
                  child: pw.Center(
                    child: pw.Text(
                      fullName[0].toUpperCase(),
                      style: ts(24, bold: true, color: cGreen),
                    ),
                  ),
                ),
                pw.SizedBox(width: 20),
                // Details
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        fullName.toUpperCase(),
                        style: ts(16, bold: true),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Row(
                        children: [
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  'Roll No.',
                                  style: ts(7, color: cTextMuted),
                                ),
                                pw.Text(rollNo, style: ts(9, bold: true)),
                                pw.SizedBox(height: 6),
                                pw.Text(
                                  'Batch',
                                  style: ts(7, color: cTextMuted),
                                ),
                                pw.Text(batchName, style: ts(9, bold: true)),
                              ],
                            ),
                          ),
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  'Class',
                                  style: ts(7, color: cTextMuted),
                                ),
                                pw.Text(grade, style: ts(9, bold: true)),
                                pw.SizedBox(height: 6),
                                pw.Text(
                                  'Status',
                                  style: ts(7, color: cTextMuted),
                                ),
                                pw.Text(
                                  'Active',
                                  style: ts(9, bold: true, color: cSuccess),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Signature Space
                pw.Container(
                  width: 120,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    mainAxisAlignment: pw.MainAxisAlignment.end,
                    children: [
                      pw.SizedBox(height: 40),
                      pw.Container(height: 1, color: cTextMuted),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Class Incharge',
                        style: ts(8, color: cTextMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 16),

          // ── METRICS GRID ──
          pw.Row(
            children: [
              statCard('Overall Score', '$overallPctStr%', 'vs Last Report'),
              statCard('Rank', 'N/A', 'in Batch'),
              statCard('Average Score', '$overallPctStr%', 'Batch Average'),
              statCard('Total Tests', '${subjects.length}', 'Tests Given'),
            ],
          ),
          pw.SizedBox(height: 16),

          // ── MAIN CONTENT (2 COLUMNS) ──
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // ── LEFT COLUMN ──
              pw.Expanded(
                child: pw.Column(
                  children: [
                    // Academic Performance
                    pw.Container(
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: cBorder),
                        borderRadius: const pw.BorderRadius.all(
                          pw.Radius.circular(8),
                        ),
                      ),
                      child: pw.Column(
                        children: [
                          sectionHeader('ACADEMIC PERFORMANCE'),
                          dataRow('SUBJECT', 'SCORE (%)', isHeader: true),
                          if (subjects.isEmpty)
                            pw.Container(
                              padding: const pw.EdgeInsets.all(32),
                              child: pw.Center(
                                child: pw.Text(
                                  'No test results recorded yet.',
                                  style: ts(9, color: cTextMuted),
                                ),
                              ),
                            )
                          else
                            ...subjects.map((s) {
                              final sub = s as Map<String, dynamic>;
                              final m = (sub['marks'] ?? 0) as num;
                              final t = (sub['total'] ?? 1) as num;
                              final pct = t > 0
                                  ? (m / t * 100).toStringAsFixed(1)
                                  : '0';
                              return dataRow(
                                sub['name']?.toString() ?? '',
                                '$pct%',
                              );
                            }),
                        ],
                      ),
                    ),
                    pw.SizedBox(height: 16),

                    // Fee Status
                    pw.Container(
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: cBorder),
                        borderRadius: const pw.BorderRadius.all(
                          pw.Radius.circular(8),
                        ),
                      ),
                      child: pw.Column(
                        children: [
                          sectionHeader('FEE STATUS'),
                          dataRow(
                            'PARTICULARS',
                            'AMOUNT (Rs.)',
                            isHeader: true,
                          ),
                          dataRow('Total Fees', totalFees.toStringAsFixed(2)),
                          dataRow(
                            'Amount Paid',
                            paidFees.toStringAsFixed(2),
                            valueColor: cSuccess,
                          ),
                          dataRow(
                            'Amount Pending',
                            pendingFees.toStringAsFixed(2),
                            valueColor: pendingFees > 0 ? cError : cTextMain,
                          ),
                          dataRow(
                            'Payment Status',
                            pendingFees <= 0 ? 'Clear' : 'Pending',
                          ),
                          dataRow(
                            'Next Due Date',
                            nextDue != null ? _formatDate(nextDue) : '-',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(width: 16),

              // ── RIGHT COLUMN ──
              pw.Expanded(
                child: pw.Column(
                  children: [
                    // Attendance Overview
                    pw.Container(
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: cBorder),
                        borderRadius: const pw.BorderRadius.all(
                          pw.Radius.circular(8),
                        ),
                      ),
                      child: pw.Column(
                        children: [
                          sectionHeader('ATTENDANCE OVERVIEW'),
                          dataRow('TYPE', 'PERCENTAGE', isHeader: true),
                          dataRow(
                            'Total Working Days',
                            '$totalDays',
                            valueColor: cTextMuted,
                          ),
                          dataRow(
                            'Days Present',
                            '${totalDays > 0 ? (presentDays / totalDays * 100).toStringAsFixed(0) : 0}%',
                            valueColor: cSuccess,
                          ),
                          dataRow(
                            'Days Absent',
                            '${totalDays > 0 ? (absentDays / totalDays * 100).toStringAsFixed(0) : 0}%',
                            valueColor: absentDays > 0 ? cError : cTextMuted,
                          ),
                          dataRow('Days Late', '0%', valueColor: cWarn),
                          pw.Container(
                            padding: const pw.EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            child: pw.Row(
                              mainAxisAlignment:
                                  pw.MainAxisAlignment.spaceBetween,
                              children: [
                                pw.Text(
                                  'Attendance %',
                                  style: ts(9, bold: true),
                                ),
                                pw.Text(
                                  '${attPct.toStringAsFixed(1)}%',
                                  style: ts(
                                    10,
                                    bold: true,
                                    color: attPct >= 75 ? cSuccess : cError,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    pw.SizedBox(height: 16),

                    // Recent Tests
                    pw.Container(
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: cBorder),
                        borderRadius: const pw.BorderRadius.all(
                          pw.Radius.circular(8),
                        ),
                      ),
                      child: pw.Column(
                        children: [
                          sectionHeader('RECENT TESTS'),
                          pw.Container(
                            padding: const pw.EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: pw.BoxDecoration(
                              border: pw.Border(
                                bottom: pw.BorderSide(
                                  color: cBorder,
                                  width: 0.5,
                                ),
                              ),
                            ),
                            child: pw.Row(
                              children: [
                                pw.Expanded(
                                  flex: 3,
                                  child: pw.Text(
                                    'TEST NAME',
                                    style: ts(8, bold: true, color: cTextMuted),
                                  ),
                                ),
                                pw.Expanded(
                                  flex: 2,
                                  child: pw.Text(
                                    'DATE',
                                    style: ts(8, bold: true, color: cTextMuted),
                                  ),
                                ),
                                pw.Expanded(
                                  flex: 2,
                                  child: pw.Text(
                                    'SCORE(%)',
                                    style: ts(8, bold: true, color: cTextMuted),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          pw.Container(
                            padding: const pw.EdgeInsets.all(32),
                            child: pw.Center(
                              child: pw.Text(
                                'No test attempts yet.',
                                style: ts(9, color: cTextMuted),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 16),

          // ── REMARKS (2 COLUMNS) ──
          pw.Row(
            children: [
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: cBorder),
                    borderRadius: const pw.BorderRadius.all(
                      pw.Radius.circular(8),
                    ),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text("TEACHER'S REMARKS", style: ts(9, bold: true)),
                      pw.SizedBox(height: 8),
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            'Excellent! Keep it up.',
                            style: ts(7, color: cSuccess),
                          ),
                          pw.Text('Good effort.', style: ts(7, color: cGreen)),
                          pw.Text(
                            'Needs improvement.',
                            style: ts(7, color: cError),
                          ),
                        ],
                      ),
                      pw.SizedBox(height: 12),
                      pw.Container(height: 1, color: cBorder),
                      pw.SizedBox(height: 16),
                      pw.Container(height: 1, color: cBorder),
                      pw.SizedBox(height: 16),
                      pw.Container(height: 1, color: cBorder),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(width: 16),
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: cBorder),
                    borderRadius: const pw.BorderRadius.all(
                      pw.Radius.circular(8),
                    ),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text("PARENT'S REMARKS", style: ts(9, bold: true)),
                      pw.SizedBox(height: 22),
                      pw.Container(height: 1, color: cBorder),
                      pw.SizedBox(height: 16),
                      pw.Container(height: 1, color: cBorder),
                      pw.SizedBox(height: 16),
                      pw.Container(height: 1, color: cBorder),
                    ],
                  ),
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 40),

          // ── BOTTOM SIGNATURES ──
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                children: [
                  pw.Container(width: 120, height: 1, color: cTextMain),
                  pw.SizedBox(height: 6),
                  pw.Text('Class Teacher', style: ts(9, bold: true)),
                ],
              ),
              pw.Column(
                children: [
                  pw.Container(width: 120, height: 1, color: cTextMain),
                  pw.SizedBox(height: 6),
                  pw.Text('Academic Coordinator', style: ts(9, bold: true)),
                ],
              ),
              pw.Column(
                children: [
                  pw.Container(width: 120, height: 1, color: cTextMain),
                  pw.SizedBox(height: 6),
                  pw.Text('Parent / Guardian', style: ts(9, bold: true)),
                ],
              ),
            ],
          ),
        ],
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Report_Card_$fullName',
    );
  }

  // ──────────────────────────────────────── Helpers ─────────────────────────

  double _parseDouble(String? s) => double.tryParse(s ?? '0') ?? 0.0;

  Color _gradeColor(String? grade) {
    switch (grade?.toUpperCase()) {
      case 'A':
        return AppColors.success;
      case 'B':
        return AppColors.primary;
      case 'C':
        return Colors.orange;
      case 'D':
        return AppColors.error;
      default:
        return Colors.grey;
    }
  }

  Color _attColor(double pct) {
    if (pct >= 75) return AppColors.success;
    if (pct >= 50) return Colors.orange;
    return AppColors.error;
  }

  // ──────────────────────────────────────── Build ───────────────────────────

  @override
  Widget build(BuildContext context) {
    final fullName =
        widget.student['fullName']?.toString() ?? 'Unknown Student';
    final rollNo = widget.student['rollNo']?.toString() ?? 'N/A';
    final grade = widget.student['grade']?.toString();
    final batchName = widget.student['batchName']?.toString();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Performance Report',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: widget.detailsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Text(
            friendlyErrorMessage(err),
            style: const TextStyle(color: Colors.grey),
          ),
        ),
        data: (details) {
          // ── Parse academics ──
          final academics = details['academics'] as Map<String, dynamic>?;
          final overallPct = _parseDouble(
            academics?['overallPercentage']?.toString(),
          );
          final academicGrade = academics?['grade']?.toString() ?? 'N/A';
          final subjects = (academics?['subjects'] as List<dynamic>?) ?? [];

          // ── Parse attendance ──
          final att = details['attendance'] as Map<String, dynamic>?;
          final totalDays =
              int.tryParse(att?['totalDays']?.toString() ?? '0') ?? 0;
          final presentDays =
              int.tryParse(att?['presentDays']?.toString() ?? '0') ?? 0;
          final absentDays =
              int.tryParse(att?['absentDays']?.toString() ?? '0') ?? 0;
          final attPct = totalDays > 0 ? (presentDays / totalDays * 100) : 0.0;
          final monthly = (att?['monthly'] as List<dynamic>?) ?? [];

          // ── Parse fees ──
          final fees = details['fees'] as Map<String, dynamic>?;
          final feeOv = fees?['overview'] as Map<String, dynamic>?;
          final totalFees = (feeOv?['total'] ?? 0) as num;
          final paidFees = (feeOv?['paid'] ?? 0) as num;
          final pendingFees = (feeOv?['pending'] ?? 0) as num;
          final nextDue = feeOv?['nextDue']?.toString();

          return CustomScrollView(
            slivers: [
              // ─── Gradient Header ───
              SliverToBoxAdapter(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1F2E27), Color(0xFF2E6656)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Avatar
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.3),
                                width: 2,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                fullName[0].toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 26,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fullName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  [
                                    'Roll: $rollNo',
                                    if (grade != null && grade.isNotEmpty)
                                      'Class $grade',
                                  ].join('  •  '),
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.75),
                                    fontSize: 12,
                                  ),
                                ),
                                if (batchName != null &&
                                    batchName.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    batchName,
                                    style: TextStyle(
                                      color: Colors.white.withValues(
                                        alpha: 0.6,
                                      ),
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // 3 quick stat chips
                      Row(
                        children: [
                          _statChip(
                            '${overallPct.toStringAsFixed(1)}%',
                            'Overall',
                            Icons.bar_chart_rounded,
                          ),
                          const SizedBox(width: 8),
                          _statChip(
                            academicGrade,
                            'Grade',
                            Icons.school_rounded,
                            color: _gradeColor(academicGrade),
                          ),
                          const SizedBox(width: 8),
                          _statChip(
                            '${attPct.toStringAsFixed(1)}%',
                            'Attendance',
                            Icons.calendar_today_rounded,
                            color: _attColor(attPct),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    // ─── Academic Performance ───
                    _sectionHeader(
                      'Academic Performance',
                      Icons.menu_book_rounded,
                    ),
                    const SizedBox(height: 12),
                    if (subjects.isEmpty)
                      _emptyState('No test results recorded yet.')
                    else
                      _whiteCard(
                        child: Column(
                          children: [
                            // Overall score bar
                            _subjectBar(
                              name: 'Overall Score',
                              pct: overallPct / 100,
                              displayPct: '$overallPct%',
                              grade: academicGrade,
                              isOverall: true,
                            ),
                            const Divider(height: 24),
                            // Per-subject bars
                            ...subjects.asMap().entries.map((e) {
                              final s = e.value as Map<String, dynamic>;
                              final marks = (s['marks'] ?? 0) as num;
                              final total = ((s['total'] ?? 1) as num).toInt();
                              final pct = total > 0 ? marks / total : 0.0;
                              final pctStr = total > 0
                                  ? '${(pct * 100).toStringAsFixed(1)}%'
                                  : 'N/A';
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 14),
                                child: _subjectBar(
                                  name: s['name']?.toString() ?? 'Subject',
                                  pct: pct.toDouble(),
                                  displayPct: '$marks/$total ($pctStr)',
                                  grade: s['grade']?.toString() ?? '—',
                                ),
                              );
                            }),
                          ],
                        ),
                      ),

                    const SizedBox(height: 24),

                    // ─── Attendance ───
                    _sectionHeader(
                      'Attendance Insights',
                      Icons.calendar_month_rounded,
                    ),
                    const SizedBox(height: 12),
                    _whiteCard(
                      child: Column(
                        children: [
                          // Summary row
                          Row(
                            children: [
                              // Donut
                              SizedBox(
                                width: 90,
                                height: 90,
                                child: Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    CircularProgressIndicator(
                                      value: attPct / 100,
                                      strokeWidth: 9,
                                      backgroundColor: Colors.grey.shade100,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        _attColor(attPct),
                                      ),
                                    ),
                                    Center(
                                      child: Text(
                                        '${attPct.toStringAsFixed(1)}%',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primaryDark,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 20),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _attStatRow(
                                      Icons.check_circle_rounded,
                                      'Present',
                                      '$presentDays days',
                                      AppColors.success,
                                    ),
                                    const SizedBox(height: 8),
                                    _attStatRow(
                                      Icons.cancel_rounded,
                                      'Absent',
                                      '$absentDays days',
                                      AppColors.error,
                                    ),
                                    const SizedBox(height: 8),
                                    _attStatRow(
                                      Icons.circle_outlined,
                                      'Total Working',
                                      '$totalDays days',
                                      Colors.grey,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          // Monthly breakdown
                          if (monthly.isNotEmpty) ...[
                            const Divider(height: 28),
                            const Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'Monthly Breakdown',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            ...monthly.take(6).map((m) {
                              final mn = m as Map<String, dynamic>;
                              final mPresent = (mn['present'] ?? 0) as int;
                              final mTotal = ((mn['total'] ?? 1) as int);
                              final mPct = mTotal > 0 ? mPresent / mTotal : 0.0;
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 90,
                                      child: Text(
                                        mn['month']
                                                ?.toString()
                                                .split(' ')
                                                .first ??
                                            '',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(6),
                                        child: LinearProgressIndicator(
                                          value: mPct,
                                          minHeight: 8,
                                          backgroundColor: Colors.grey.shade100,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                _attColor(mPct * 100),
                                              ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    SizedBox(
                                      width: 36,
                                      child: Text(
                                        '${(mPct * 100).toStringAsFixed(0)}%',
                                        textAlign: TextAlign.right,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: _attColor(mPct * 100),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // ─── Fee Status ───
                    if (totalFees > 0) ...[
                      _sectionHeader(
                        'Fee Status',
                        Icons.account_balance_wallet_rounded,
                      ),
                      const SizedBox(height: 12),
                      _whiteCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Summary gradient card
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF1F2E27),
                                    Color(0xFF2E6656),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Total Fees',
                                          style: TextStyle(
                                            color: Colors.white.withValues(
                                              alpha: 0.6,
                                            ),
                                            fontSize: 11,
                                          ),
                                        ),
                                        Text(
                                          '₹$totalFees',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 22,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        'Paid',
                                        style: TextStyle(
                                          color: Colors.white.withValues(
                                            alpha: 0.6,
                                          ),
                                          fontSize: 11,
                                        ),
                                      ),
                                      Text(
                                        '₹$paidFees',
                                        style: const TextStyle(
                                          color: Color(0xFFA87D26),
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      if (pendingFees > 0) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          'Pending ₹$pendingFees',
                                          style: TextStyle(
                                            color: AppColors.error.withValues(
                                              alpha: 0.85,
                                            ),
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            if (nextDue != null) ...[
                              const SizedBox(height: 14),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.event_rounded,
                                    size: 16,
                                    color: Colors.orange,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Next Due: ${_formatDate(nextDue)}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.orange,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            // Progress bar
                            const SizedBox(height: 14),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: totalFees > 0
                                    ? (paidFees / totalFees)
                                          .clamp(0.0, 1.0)
                                          .toDouble()
                                    : 0,
                                minHeight: 8,
                                backgroundColor: Colors.grey.shade100,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  pendingFees > 0
                                      ? Colors.orange
                                      : AppColors.success,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              totalFees > 0
                                  ? '${(paidFees / totalFees * 100).toStringAsFixed(1)}% paid'
                                  : '0% paid',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // ─── Download Button ───
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton.icon(
                        onPressed: () => _generatePdf(details, ref),
                        icon: const Icon(
                          Icons.download_rounded,
                          color: Colors.white,
                        ),
                        label: const Text(
                          'Download PDF Report',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryDark,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  // ──────────────────────────────────────── Sub-Widgets ─────────────────────

  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.primaryDark,
          ),
        ),
      ],
    );
  }

  Widget _whiteCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _statChip(
    String value,
    String label,
    IconData icon, {
    Color color = Colors.white,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(height: 3),
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.65),
                fontSize: 9,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _subjectBar({
    required String name,
    required double pct,
    required String displayPct,
    required String grade,
    bool isOverall = false,
  }) {
    final color = _gradeColor(grade);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                name,
                style: TextStyle(
                  fontSize: isOverall ? 14 : 13,
                  fontWeight: isOverall ? FontWeight.bold : FontWeight.w500,
                  color: AppColors.primaryDark,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                grade,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: pct.clamp(0.0, 1.0),
            minHeight: isOverall ? 10 : 7,
            backgroundColor: Colors.grey.shade100,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          displayPct,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
      ],
    );
  }

  Widget _attStatRow(IconData icon, String label, String value, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: AppColors.primaryDark,
          ),
        ),
      ],
    );
  }

  Widget _emptyState(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Icon(Icons.inbox_rounded, size: 40, color: Colors.grey.shade300),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ],
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    final d = DateTime.tryParse(dateStr);
    if (d == null) return dateStr;
    return DateFormat('dd MMM yyyy').format(d);
  }
}
