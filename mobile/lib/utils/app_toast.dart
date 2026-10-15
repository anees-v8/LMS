import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../main.dart' show navigatorKey;

enum ToastType { error, success, info }

class AppToast {
  static OverlayEntry? _currentEntry;
  static Timer? _dismissTimer;

  static void showError(
    BuildContext context,
    String message, {
    String? title,
  }) {
    show(
      context,
      message,
      title: title ?? 'Error',
      type: ToastType.error,
    );
  }

  static void showSuccess(
    BuildContext context,
    String message, {
    String? title,
  }) {
    show(
      context,
      message,
      title: title ?? 'Success',
      type: ToastType.success,
    );
  }

  static void showInfo(
    BuildContext context,
    String message, {
    String? title,
  }) {
    show(
      context,
      message,
      title: title ?? 'Notice',
      type: ToastType.info,
    );
  }

  static void show(
    BuildContext context,
    String message, {
    String? title,
    ToastType type = ToastType.info,
    Duration duration = const Duration(milliseconds: 3500),
  }) {
    _dismissTimer?.cancel();
    _currentEntry?.remove();
    _currentEntry = null;

    OverlayState? overlay;
    try {
      overlay = Overlay.of(context, rootOverlay: true);
    } catch (_) {
      overlay = navigatorKey.currentState?.overlay;
    }
    overlay ??= navigatorKey.currentState?.overlay;

    if (overlay == null) return;

    try {
      HapticFeedback.lightImpact();
    } catch (_) {}

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (ctx) => _TopToastWidget(
        message: message,
        title: title,
        type: type,
        onDismiss: () {
          if (_currentEntry == entry) {
            _dismissTimer?.cancel();
            _currentEntry?.remove();
            _currentEntry = null;
          }
        },
      ),
    );

    _currentEntry = entry;
    overlay.insert(entry);

    _dismissTimer = Timer(duration, () {
      if (_currentEntry == entry) {
        _currentEntry?.remove();
        _currentEntry = null;
      }
    });
  }
}

class _TopToastWidget extends StatefulWidget {
  final String message;
  final String? title;
  final ToastType type;
  final VoidCallback onDismiss;

  const _TopToastWidget({
    required this.message,
    this.title,
    required this.type,
    required this.onDismiss,
  });

  @override
  State<_TopToastWidget> createState() => _TopToastWidgetState();
}

class _TopToastWidgetState extends State<_TopToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<Offset> _offsetAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
      reverseDuration: const Duration(milliseconds: 250),
    );

    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0, -0.6),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animController,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      ),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _handleDismiss() async {
    if (!mounted) return;
    await _animController.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    Color bg;
    Color border;
    Color iconColor;
    Color textColor;
    IconData icon;

    switch (widget.type) {
      case ToastType.error:
        bg = const Color(0xFFFEF2F2);
        border = const Color(0xFFFECACA);
        iconColor = const Color(0xFFEF4444);
        textColor = const Color(0xFF991B1B);
        icon = Icons.error_outline_rounded;
        break;
      case ToastType.success:
        bg = const Color(0xFFF0FDF4);
        border = const Color(0xFFBBF7D0);
        iconColor = const Color(0xFF22C55E);
        textColor = const Color(0xFF166534);
        icon = Icons.check_circle_outline_rounded;
        break;
      case ToastType.info:
        bg = const Color(0xFFEFF6FF);
        border = const Color(0xFFBFDBFE);
        iconColor = const Color(0xFF3B82F6);
        textColor = const Color(0xFF1E40AF);
        icon = Icons.info_outline_rounded;
        break;
    }

    return Positioned(
      top: topPadding + 10,
      left: 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: SlideTransition(
          position: _offsetAnimation,
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: GestureDetector(
              onVerticalDragUpdate: (details) {
                if (details.primaryDelta != null && details.primaryDelta! < -4) {
                  _handleDismiss();
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: border, width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: iconColor.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, color: iconColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.title != null && widget.title!.isNotEmpty)
                            Text(
                              widget.title!,
                              style: TextStyle(
                                color: textColor,
                                fontSize: 13.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            widget.message,
                            style: TextStyle(
                              color: textColor.withValues(alpha: 0.88),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w500,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: _handleDismiss,
                      borderRadius: BorderRadius.circular(20),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: textColor.withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
