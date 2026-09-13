import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_file_dialog/flutter_file_dialog.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
import '../widgets/custom_button.dart';
import '../services/api_service.dart';

/// Bottom sheet for bulk-importing students from an uploaded Excel file —
/// download a sample template, pick a filled copy, and import it in one
/// request against `POST /admin/students/import`. Shown from the Students
/// screen's app bar so an admin onboarding 20-80 students doesn't have to
/// fill the "Add Student" form one at a time.
Future<void> showImportStudentsSheet(
  BuildContext context,
  VoidCallback onImported,
) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ImportStudentsSheet(onImported: onImported),
  );
}

class ImportStudentsSheet extends StatefulWidget {
  final VoidCallback onImported;
  const ImportStudentsSheet({super.key, required this.onImported});

  @override
  State<ImportStudentsSheet> createState() => _ImportStudentsSheetState();
}

class _ImportStudentsSheetState extends State<ImportStudentsSheet> {
  PlatformFile? _selectedFile;
  bool _downloading = false;
  bool _importing = false;
  String? _error;

  Future<Map<String, String>> _authHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    return {if (token != null) 'Authorization': 'Bearer $token'};
  }

  Future<void> _downloadSample() async {
    setState(() {
      _downloading = true;
      _error = null;
    });
    try {
      final headers = await _authHeaders();
      final res = await http.get(
        Uri.parse('${Constants.baseUrl}/admin/students/import-sample'),
        headers: headers,
      );
      if (res.statusCode != 200) {
        throw Exception('Could not download sample (${res.statusCode})');
      }
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/student-import-sample.xlsx');
      await file.writeAsBytes(res.bodyBytes);

      final saved = await FlutterFileDialog.saveFile(
        params: SaveFileDialogParams(sourceFilePath: file.path),
      );
      if (saved != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sample file saved.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() => _error = 'Download failed: ${friendlyErrorMessage(e)}');
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'xls', 'csv'],
      withReadStream: true,
      withData: false,
    );
    if (result != null && result.files.isNotEmpty) {
      setState(() {
        _selectedFile = result.files.first;
        _error = null;
      });
    }
  }

  Future<void> _import() async {
    final picked = _selectedFile;
    if (picked == null || picked.path == null) {
      setState(() => _error = 'Choose a filled Excel file first.');
      return;
    }
    setState(() {
      _importing = true;
      _error = null;
    });
    try {
      final headers = await _authHeaders();
      final uri = Uri.parse('${Constants.baseUrl}/admin/students/import');
      final req = http.MultipartRequest('POST', uri)..headers.addAll(headers);

      final file = File(picked.path!);
      final length = await file.length();
      req.files.add(
        http.MultipartFile(
          'file',
          file.openRead(),
          length,
          filename: picked.name,
        ),
      );

      final streamed = await req.send();
      final res = await http.Response.fromStream(streamed);

      if (res.statusCode < 200 || res.statusCode >= 300) {
        String message = 'Import failed (${res.statusCode})';
        try {
          final body = jsonDecode(res.body);
          if (body is Map && body['error'] is Map) {
            message = (body['error']['message'] ?? message).toString();
          }
        } catch (_) {}
        throw Exception(message);
      }

      final result = jsonDecode(res.body) as Map<String, dynamic>;
      if (!mounted) return;
      Navigator.pop(context);
      widget.onImported();
      await _showResultDialog(context, result);
    } catch (e) {
      setState(() => _error = friendlyErrorMessage(e));
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  Future<void> _showResultDialog(
    BuildContext context,
    Map<String, dynamic> result,
  ) {
    final successCount = result['successCount'] ?? 0;
    final failureCount = result['failureCount'] ?? 0;
    final failures = (result['failures'] as List?) ?? [];

    return showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          failureCount == 0 ? 'Import complete' : 'Import finished with issues',
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$successCount student(s) added successfully.',
                style: const TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (failureCount > 0) ...[
                const SizedBox(height: 8),
                Text(
                  '$failureCount row(s) skipped:',
                  style: const TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: failures.length,
                    itemBuilder: (_, i) {
                      final f = failures[i] as Map;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          'Row ${f['row']} (${f['fullName']}): ${f['reason']}',
                          style: const TextStyle(fontSize: 13),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle — consistent with every other bottom sheet in the app.
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    height: 4,
                    width: 40,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Import Students',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2E27),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                Text(
                  'Add many students at once instead of filling the form one by one.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                const SizedBox(height: 20),

                // Step 1 — sample
                _stepCard(
                  step: '1',
                  title: 'Download the sample file',
                  subtitle:
                      'Fill it in with your students\' details. "Batch Name" must match an existing batch exactly.',
                  trailing: OutlinedButton.icon(
                    onPressed: _downloading ? null : _downloadSample,
                    icon: _downloading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.download_outlined, size: 18),
                    label: const Text('Download'),
                  ),
                ),
                const SizedBox(height: 12),

                // Step 2 — pick file
                _stepCard(
                  step: '2',
                  title: 'Choose your filled file',
                  subtitle:
                      _selectedFile?.name ?? 'Accepts .xlsx, .xls, or .csv',
                  trailing: OutlinedButton.icon(
                    onPressed: _pickFile,
                    icon: const Icon(Icons.attach_file, size: 18),
                    label: Text(_selectedFile == null ? 'Choose' : 'Change'),
                  ),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _error!,
                    style: const TextStyle(color: Colors.red, fontSize: 13),
                  ),
                ],

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: _importing
                      ? const Center(child: CircularProgressIndicator())
                      : CustomButton(
                          text: 'Import Students',
                          onPressed: _import,
                        ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepCard({
    required String step,
    required String title,
    required String subtitle,
    required Widget trailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F6F3),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: const Color(0xFF1F2E27),
            child: Text(
              step,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          trailing,
        ],
      ),
    );
  }
}
