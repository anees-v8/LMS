import 'package:flutter/material.dart';

/// One row in an [ActionMenuBottomSheet].
class ActionMenuOption {
  final IconData icon;
  final String label;
  final Color? color;
  final String value;

  const ActionMenuOption({
    required this.icon,
    required this.label,
    required this.value,
    this.color,
  });
}

/// App-wide replacement for [PopupMenuButton] "⋮" dropdowns — every
/// per-item action menu (edit/delete/etc.) opens this same bottom sheet
/// instead, for visual consistency with every other sheet in the app
/// (drag handle, rounded top corners, white background).
///
/// Usage:
///   final action = await showActionMenuBottomSheet(context, options: [...]);
///   if (action == 'edit') { ... }
Future<String?> showActionMenuBottomSheet(
  BuildContext context, {
  String? title,
  required List<ActionMenuOption> options,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _ActionMenuBottomSheet(title: title, options: options),
  );
}

class _ActionMenuBottomSheet extends StatelessWidget {
  final String? title;
  final List<ActionMenuOption> options;

  const _ActionMenuBottomSheet({this.title, required this.options});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle — consistent with every other bottom sheet in the app.
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 4),
                height: 4,
                width: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            if (title != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 4),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    title!,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2E27),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 4),
            for (final option in options)
              InkWell(
                onTap: () => Navigator.pop(context, option.value),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 14,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        option.icon,
                        size: 20,
                        color: option.color ?? const Color(0xFF1F2E27),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        option.label,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: option.color ?? const Color(0xFF1F2E27),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
