import 'package:flutter/material.dart';

/// Floating "Done (X/Y)" pill — animates in once at least one student has
/// been marked, tapping it opens [AttendanceConfirmSheet].
class AttendanceDoneFab extends StatelessWidget {
  final int markedCount;
  final int totalCount;
  final bool visible;
  final VoidCallback onTap;

  const AttendanceDoneFab({
    super.key,
    required this.markedCount,
    required this.totalCount,
    required this.visible,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSlide(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutBack,
      offset: visible ? Offset.zero : const Offset(0, 0.4),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: visible ? 1 : 0,
        child: IgnorePointer(
          ignoring: !visible,
          child: GestureDetector(
            onTap: onTap,
            child: Container(
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFFA87D26),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFA87D26).withValues(alpha: 0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Done ($markedCount/$totalCount)',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
