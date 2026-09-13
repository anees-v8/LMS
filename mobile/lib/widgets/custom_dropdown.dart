import 'package:flutter/material.dart';

/// One selectable option in a [CustomDropdown].
class DropdownOption<T> {
  final T value;
  final String label;
  final IconData? icon;

  const DropdownOption({required this.value, required this.label, this.icon});
}

/// The app's single, consistent dropdown field — used everywhere a user
/// picks one value from a list (batch, subject, teacher, day, billing
/// cycle, status, etc.) instead of every screen styling its own
/// [DropdownButton]/[DropdownButtonFormField], which each render Flutter's
/// unstyled default popup menu when opened.
///
/// Tapping the field opens a themed bottom sheet listing every option —
/// matching the rest of the app's bottom-sheet forms — with the current
/// selection highlighted, rather than Flutter's plain default dropdown
/// overlay.
class CustomDropdown<T> extends StatelessWidget {
  final String label;
  final String hint;
  final T? value;
  final List<DropdownOption<T>> options;
  final ValueChanged<T?> onChanged;
  final IconData? prefixIcon;
  final bool enabled;

  const CustomDropdown({
    super.key,
    required this.label,
    required this.hint,
    required this.value,
    required this.options,
    required this.onChanged,
    this.prefixIcon,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final selected = options
        .where((o) => o.value == value)
        .cast<DropdownOption<T>?>()
        .firstOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1F2E27),
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: enabled
              ? () => _openOptionsSheet(context)
              : null,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            decoration: BoxDecoration(
              color: enabled ? Colors.white : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                if (prefixIcon != null) ...[
                  Icon(
                    selected?.icon ?? prefixIcon,
                    color: const Color(0xFF2E6656),
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Text(
                    selected?.label ?? hint,
                    style: TextStyle(
                      color: selected != null
                          ? const Color(0xFF1F2E27)
                          : const Color(0xFF1F2E27).withValues(alpha: 0.5),
                      fontWeight: selected != null
                          ? FontWeight.w600
                          : FontWeight.normal,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.keyboard_arrow_down,
                  color: enabled ? Colors.grey.shade700 : Colors.grey.shade400,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _openOptionsSheet(BuildContext context) async {
    final picked = await showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DropdownOptionsSheet<T>(
        title: label,
        options: options,
        selectedValue: value,
      ),
    );
    if (picked is _NoSelection) return; // sheet dismissed without a tap
    onChanged(picked);
  }
}

/// Sentinel distinguishing "user dismissed the sheet" (no-op) from
/// "user tapped a genuinely null-valued option" (e.g. an "All" entry).
class _NoSelection {
  const _NoSelection();
}

class _DropdownOptionsSheet<T> extends StatelessWidget {
  final String title;
  final List<DropdownOption<T>> options;
  final T? selectedValue;

  const _DropdownOptionsSheet({
    required this.title,
    required this.options,
    required this.selectedValue,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.7,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
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
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2E27),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context, const _NoSelection()),
                ),
              ],
            ),
          ),
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              itemCount: options.length,
              separatorBuilder: (_, _) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final option = options[index];
                final isSelected = option.value == selectedValue;
                return InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => Navigator.pop(context, option.value),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF2E6656).withValues(alpha: 0.08)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        if (option.icon != null) ...[
                          Icon(
                            option.icon,
                            size: 20,
                            color: isSelected
                                ? const Color(0xFF2E6656)
                                : Colors.grey.shade600,
                          ),
                          const SizedBox(width: 12),
                        ],
                        Expanded(
                          child: Text(
                            option.label,
                            style: TextStyle(
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.w500,
                              color: isSelected
                                  ? const Color(0xFF2E6656)
                                  : const Color(0xFF1F2E27),
                            ),
                          ),
                        ),
                        if (isSelected)
                          const Icon(
                            Icons.check_circle,
                            color: Color(0xFF2E6656),
                            size: 20,
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
