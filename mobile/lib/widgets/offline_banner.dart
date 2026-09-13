import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/connectivity_service.dart';

/// A slim amber banner shown at the top of a screen when the device is offline.
/// Wrap your screen's body in a Column and put this widget first, e.g.:
///
/// ```dart
/// Column(children: [
///   const OfflineBanner(),
///   Expanded(child: myContent),
/// ])
/// ```
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityProvider);
    final isOffline =
        connectivity.whenOrNull(data: (online) => !online) ?? false;

    if (!isOffline) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: const Color(0xFFFFF8E1),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.wifi_off, size: 14, color: Color(0xFFF57F17)),
          SizedBox(width: 8),
          Text(
            'Offline – showing cached data',
            style: TextStyle(
              color: Color(0xFFF57F17),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
