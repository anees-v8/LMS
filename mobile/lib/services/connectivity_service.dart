import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A [StreamProvider] that emits `true` when the device has any network
/// connection (WiFi or mobile), and `false` when offline.
///
/// Screens can optionally watch this to show an offline banner.
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
    (results) => results.any((r) => r != ConnectivityResult.none),
  );
});
