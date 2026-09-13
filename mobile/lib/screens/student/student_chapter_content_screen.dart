import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/app_colors.dart';
import '../../utils/duration_format.dart';
import 'pdf_viewer_screen.dart';

String? extractYoutubeId(String url) {
  RegExp regExp = RegExp(
    r'.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*',
    caseSensitive: false,
    multiLine: false,
  );
  final match = regExp.firstMatch(url);
  if (match != null && match.groupCount >= 1 && match.group(1)!.length == 11)
    return match.group(1);
  return null;
}

class StudentChapterContentScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> chapter;
  final String subjectName;
  final int? autoSelectContentId;
  final int? startAtSeconds;

  const StudentChapterContentScreen({
    super.key,
    required this.chapter,
    required this.subjectName,
    this.autoSelectContentId,
    this.startAtSeconds,
  });

  @override
  ConsumerState<StudentChapterContentScreen> createState() =>
      _StudentChapterContentScreenState();
}

class _StudentChapterContentScreenState
    extends ConsumerState<StudentChapterContentScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _selectedContent;
  late TabController _tabController;
  YoutubePlayerController? _ytController;
  Timer? _progressTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _progressTimer?.cancel();
    _tabController.dispose();
    _ytController?.close();
    super.dispose();
  }

  void _updateSelection(Map<String, dynamic> item) {
    setState(() {
      _selectedContent = item;
      _progressTimer?.cancel();
      _ytController?.close();
      _ytController = null;

      final type = item['contentType']?.toString() ?? '';
      if (type.contains('video')) {
        final url = item['fileUrl']?.toString();
        if (url != null) {
          final videoId = extractYoutubeId(url);
          if (videoId != null) {
            _ytController = YoutubePlayerController.fromVideoId(
              videoId: videoId,
              autoPlay: false,
              startSeconds: (item['progressSeconds'] as int? ?? 0).toDouble(),
              params: const YoutubePlayerParams(showFullscreenButton: true),
            );

            _progressTimer = Timer.periodic(const Duration(seconds: 10), (
              _,
            ) async {
              if (!mounted || _ytController == null) return;
              try {
                final state = await _ytController!.playerState;
                if (state == PlayerState.playing) {
                  final time = await _ytController!.currentTime;
                  final contentId = item['id'] as int?;
                  if (contentId != null) {
                    final api = ref.read(apiServiceProvider);
                    api
                        .post('/student/progress', {
                          'contentId': contentId,
                          'progressSeconds': time.toInt(),
                        })
                        .catchError((_) {});
                  }
                }
              } catch (_) {}
            });
          }
        }
      }
    });
  }

  void _openResource(Map<String, dynamic> item) {
    final type = item['contentType']?.toString().toLowerCase() ?? '';
    final url = item['fileUrl']?.toString();
    if (url == null || url.isEmpty) return;

    if (!type.contains('video')) {
      _ytController?.pauseVideo();
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              PdfViewerScreen(url: url, title: item['title'] ?? 'Document'),
        ),
      );
    } else {
      _launchURL(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chapterId = widget.chapter['id'] as int? ?? 0;
    final contentAsync = ref.watch(studentChapterContentProvider(chapterId));

    final isVideo =
        _selectedContent?['contentType']?.toString().contains('video') ?? false;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.subjectName,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 11,
              ),
            ),
            Text(
              widget.chapter['name'] as String? ??
                  widget.chapter['title'] as String? ??
                  'Chapter',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── Media Area (Fixed Top) ────────────────────────────────────
          Container(
            width: double.infinity,
            height: 220,
            color: Colors.black,
            child: _selectedContent == null
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : isVideo
                ? (_ytController != null
                      ? YoutubePlayer(controller: _ytController!)
                      : GestureDetector(
                          onTap: () => _launchURL(
                            _selectedContent?['fileUrl'] as String?,
                          ),
                          child: _VideoPlaceholder(
                            title: _selectedContent?['title'] ?? '',
                          ),
                        ))
                : _PdfPlaceholder(
                    title: _selectedContent?['title'] ?? '',
                    onOpen: () {
                      if (_selectedContent != null) {
                        _openResource(_selectedContent!);
                      }
                    },
                  ),
          ),

          // ── Content Info Strip ────────────────────────────────────────
          Container(
            color: const Color(0xFF1F2E27),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Icon(
                  isVideo
                      ? Icons.play_circle_filled_rounded
                      : Icons.picture_as_pdf_rounded,
                  color: const Color(0xFFA87D26),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _selectedContent?['title'] ?? '',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  _selectedContent == null
                      ? ''
                      : formatExactDuration(
                          _selectedContent?['durationSeconds'] as int?,
                          fallbackMinutes:
                              _selectedContent?['durationMinutes'] as int?,
                        ),
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),

          // ── Tab Bar ───────────────────────────────────────────────────
          Container(
            color: AppColors.background,
            child: TabBar(
              controller: _tabController,
              indicatorColor: const Color(0xFFA87D26),
              labelColor: AppColors.primaryDark,
              unselectedLabelColor: Colors.grey,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
              tabs: const [
                Tab(text: 'Lectures'),
                Tab(text: 'Resources'),
              ],
            ),
          ),

          // ── Content List (Scrollable Bottom) ─────────────────────────
          Expanded(
            child: Container(
              color: AppColors.background,
              child: contentAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Text(
                    friendlyErrorMessage(e),
                    style: const TextStyle(color: Colors.grey),
                  ),
                ),
                data: (contentItems) {
                  final lectures = contentItems
                      .where(
                        (item) =>
                            item['contentType'].toString().contains('video'),
                      )
                      .toList();
                  final resources = contentItems
                      .where(
                        (item) =>
                            !item['contentType'].toString().contains('video'),
                      )
                      .toList();

                  // Auto-select if requested and not already selected
                  if (_selectedContent == null) {
                    bool didAutoSelect = false;

                    if (widget.autoSelectContentId != null) {
                      final toSelect = lectures
                          .where((c) => c['id'] == widget.autoSelectContentId)
                          .firstOrNull;
                      if (toSelect != null) {
                        didAutoSelect = true;
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          final mutableItem = Map<String, dynamic>.from(
                            toSelect,
                          );
                          if (widget.startAtSeconds != null) {
                            mutableItem['progressSeconds'] =
                                widget.startAtSeconds;
                          }
                          _updateSelection(mutableItem);
                        });
                      }
                    }

                    // Auto select first item if none selected
                    if (!didAutoSelect && contentItems.isNotEmpty) {
                      final firstVideo = contentItems.firstWhere(
                        (item) =>
                            item['contentType'].toString().contains('video'),
                        orElse: () => contentItems.first,
                      );
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        _updateSelection(firstVideo as Map<String, dynamic>);
                      });
                    }
                  }

                  return TabBarView(
                    controller: _tabController,
                    children: [
                      // Lectures Tab
                      lectures.isEmpty
                          ? const Center(
                              child: Text(
                                'No lectures in this chapter yet.',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: lectures.length,
                              itemBuilder: (context, index) {
                                final item =
                                    lectures[index] as Map<String, dynamic>;
                                final isSelected =
                                    _selectedContent?['id'] == item['id'];
                                return _ContentTile(
                                  item: item,
                                  isSelected: isSelected,
                                  ytController: isSelected
                                      ? _ytController
                                      : null,
                                  onTap: () => _updateSelection(item),
                                );
                              },
                            ),
                      // Resources Tab
                      resources.isEmpty
                          ? const Center(
                              child: Text(
                                'No resources in this chapter yet.',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: resources.length,
                              itemBuilder: (context, index) {
                                final item =
                                    resources[index] as Map<String, dynamic>;
                                final isSelected =
                                    _selectedContent?['id'] == item['id'];
                                return _ContentTile(
                                  item: item,
                                  isSelected: isSelected,
                                  ytController: isSelected
                                      ? _ytController
                                      : null,
                                  onTap: () => _openResource(item),
                                );
                              },
                            ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _launchURL(String? urlString) async {
    if (urlString == null || urlString.isEmpty) return;
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Could not open link')));
      }
    }
  }
}

class _PlayingIndicator extends StatefulWidget {
  final YoutubePlayerController? ytController;
  const _PlayingIndicator({this.ytController});
  @override
  State<_PlayingIndicator> createState() => _PlayingIndicatorState();
}

class _PlayingIndicatorState extends State<_PlayingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    if (widget.ytController != null) {
      _pollingTimer = Timer.periodic(const Duration(milliseconds: 500), (
        _,
      ) async {
        if (!mounted) return;
        try {
          final state = await widget.ytController!.playerState;
          if (state == PlayerState.playing) {
            if (!_controller.isAnimating) _controller.repeat(reverse: true);
          } else {
            if (_controller.isAnimating) _controller.stop();
          }
        } catch (_) {}
      });
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final delay = index * 0.2;
            double value = _controller.value - delay;
            if (value < 0) value += 1;
            if (value > 1) value -= 1;
            // Create a triangle wave
            final height =
                4.0 + (value < 0.5 ? value * 2 : (1 - value) * 2) * 12.0;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 1.5),
              width: 4,
              height: height,
              decoration: BoxDecoration(
                color: const Color(0xFFA87D26),
                borderRadius: BorderRadius.circular(2),
              ),
            );
          },
        );
      }),
    );
  }
}

class _ContentTile extends StatelessWidget {
  final Map<String, dynamic> item;
  final bool isSelected;
  final YoutubePlayerController? ytController;
  final VoidCallback onTap;

  const _ContentTile({
    required this.item,
    required this.isSelected,
    this.ytController,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final title = item['title'] as String? ?? 'Content';
    final type = item['contentType'] as String? ?? 'video';
    final isVideo = type.contains('video');
    final duration = formatExactDuration(
      item['durationSeconds'] as int?,
      fallbackMinutes: item['durationMinutes'] as int?,
    );

    String? videoId;
    if (isVideo) {
      final url = item['fileUrl']?.toString();
      if (url != null) videoId = extractYoutubeId(url);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryDark : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primaryDark : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.primaryDark.withValues(alpha: 0.2),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Row(
          children: [
            // Icon or Thumbnail
            Container(
              width: 70, // Wider for 16:9 thumbnail ratio
              height: 44,
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.15)
                    : isVideo
                    ? AppColors.infoLight
                    : AppColors.errorLight,
                borderRadius: BorderRadius.circular(8),
                image: videoId != null
                    ? DecorationImage(
                        image: NetworkImage(
                          'https://img.youtube.com/vi/$videoId/hqdefault.jpg',
                        ),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: videoId == null
                  ? Icon(
                      isVideo
                          ? Icons.play_arrow_rounded
                          : Icons.picture_as_pdf_rounded,
                      color: isSelected
                          ? Colors.white
                          : isVideo
                          ? AppColors.info
                          : AppColors.error,
                      size: 22,
                    )
                  : Center(
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.play_arrow_rounded,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: 14),
            // Text info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: isSelected ? Colors.white : AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.timer_outlined,
                        size: 12,
                        color: isSelected ? Colors.white70 : Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        duration,
                        style: TextStyle(
                          fontSize: 11,
                          color: isSelected
                              ? Colors.white70
                              : Colors.grey.shade600,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Playing Indicator on the right
            if (isSelected) _PlayingIndicator(ytController: ytController),
          ],
        ),
      ),
    );
  }
}

// ─── Placeholder Widgets ─────────────────────────────────────────────────────

class _VideoPlaceholder extends StatelessWidget {
  final String title;
  const _VideoPlaceholder({required this.title});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          color: const Color(0xFF0D1A14),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFFA87D26).withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFA87D26),
                      width: 2,
                    ),
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    color: Color(0xFFA87D26),
                    size: 38,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: const TextStyle(color: Colors.white60, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PdfPlaceholder extends StatelessWidget {
  final String title;
  final VoidCallback onOpen;
  const _PdfPlaceholder({required this.title, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF1A0505),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.picture_as_pdf_rounded,
              color: Color(0xFFE53935),
              size: 52,
            ),
            const SizedBox(height: 12),
            const Text(
              'PDF Document',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(color: Colors.white60, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: onOpen,
              icon: const Icon(Icons.open_in_new, size: 14),
              label: const Text('Open PDF'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade700,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
