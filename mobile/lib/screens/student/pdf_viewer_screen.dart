import 'dart:io';
import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:flutter_file_dialog/flutter_file_dialog.dart';
import '../../services/api_service.dart';

class PdfViewerScreen extends StatefulWidget {
  final String url;
  final String title;

  const PdfViewerScreen({super.key, required this.url, required this.title});

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  bool _isDownloading = false;

  Future<void> _downloadFile() async {
    setState(() => _isDownloading = true);
    try {
      final response = await http.get(Uri.parse(widget.url));
      if (response.statusCode == 200) {
        final dir = await getTemporaryDirectory();
        final ext = widget.url.toLowerCase().split('.').last.split('?').first;
        final validExt =
            ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].contains(ext)
            ? ext
            : 'pdf';
        var fileName = widget.title.replaceAll(
          RegExp(r'[^a-zA-Z0-9_\-\.]'),
          '_',
        );
        if (!fileName.toLowerCase().endsWith('.$validExt'))
          fileName += '.$validExt';

        final file = File('${dir.path}/$fileName');
        await file.writeAsBytes(response.bodyBytes);

        final params = SaveFileDialogParams(sourceFilePath: file.path);
        final filePath = await FlutterFileDialog.saveFile(params: params);

        if (filePath != null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'File saved successfully!',
                style: TextStyle(color: Colors.white),
              ),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception('Failed to download');
      }
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Download failed: ${friendlyErrorMessage(e)}',
              style: const TextStyle(color: Colors.white),
            ),
            backgroundColor: Colors.red,
          ),
        );
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lowerUrl = widget.url.toLowerCase();
    final isImage =
        lowerUrl.endsWith('.jpg') ||
        lowerUrl.endsWith('.jpeg') ||
        lowerUrl.endsWith('.png') ||
        lowerUrl.endsWith('.gif') ||
        lowerUrl.endsWith('.webp') ||
        widget.title.toLowerCase().contains('image');

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        actions: [
          if (_isDownloading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2,
                  ),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.download_rounded),
              tooltip: 'Download',
              onPressed: _downloadFile,
            ),
        ],
      ),
      body: isImage
          ? Center(
              child: InteractiveViewer(
                child: Image.network(
                  widget.url,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return const CircularProgressIndicator();
                  },
                  errorBuilder: (context, error, stackTrace) => const Icon(
                    Icons.broken_image,
                    size: 50,
                    color: Colors.grey,
                  ),
                ),
              ),
            )
          : SfPdfViewer.network(
              widget.url,
              canShowScrollHead: false,
              canShowScrollStatus: false,
            ),
    );
  }
}
