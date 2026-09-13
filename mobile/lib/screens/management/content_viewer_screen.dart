import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../theme/app_colors.dart';

class ContentViewerScreen extends ConsumerStatefulWidget {
  final String title;
  final String fileUrl;
  final String contentType;

  const ContentViewerScreen({
    super.key,
    required this.title,
    required this.fileUrl,
    required this.contentType,
  });

  @override
  ConsumerState<ContentViewerScreen> createState() =>
      _ContentViewerScreenState();
}

class _ContentViewerScreenState extends ConsumerState<ContentViewerScreen> {
  YoutubePlayerController? _ytController;

  @override
  void initState() {
    super.initState();
    if (widget.contentType == 'video') {
      final videoId = YoutubePlayerController.convertUrlToId(widget.fileUrl);
      if (videoId != null) {
        _ytController = YoutubePlayerController.fromVideoId(
          videoId: videoId,
          params: const YoutubePlayerParams(
            showControls: true,
            showFullscreenButton: true,
            mute: false,
          ),
          autoPlay: true,
        );
      }
    }
  }

  @override
  void dispose() {
    _ytController?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(color: Colors.white, fontSize: 18),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (widget.contentType == 'video') {
      if (_ytController == null) {
        return const Center(child: Text('Invalid YouTube URL'));
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(12),
            ),
            child: YoutubePlayer(controller: _ytController!),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(
              widget.title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
              textAlign: TextAlign.left,
            ),
          ),
        ],
      );
    } else if (widget.contentType == 'document') {
      return SfPdfViewer.network(
        widget.fileUrl,
        canShowScrollHead: false,
        canShowScrollStatus: false,
      );
    } else if (widget.contentType == 'image') {
      return Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4.0,
          child: Image.network(
            widget.fileUrl,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                            (loadingProgress.expectedTotalBytes ?? 1)
                      : null,
                ),
              );
            },
            errorBuilder: (_, __, ___) =>
                const Center(child: Text('Failed to load image')),
          ),
        ),
      );
    }

    return const Center(child: Text('Unsupported content type'));
  }
}
