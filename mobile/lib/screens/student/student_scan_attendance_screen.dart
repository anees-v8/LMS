import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../theme/app_colors.dart';
import '../../providers/student_providers.dart';
import '../../services/api_service.dart';
import '../../utils/app_toast.dart';

/// Camera scanner for a teacher's attendance QR. Expiry/enrollment are
/// validated server-side (see [scanAttendanceQr]) — this screen only
/// shows whatever the backend decides.
class StudentScanAttendanceScreen extends ConsumerStatefulWidget {
  const StudentScanAttendanceScreen({super.key});

  @override
  ConsumerState<StudentScanAttendanceScreen> createState() =>
      _StudentScanAttendanceScreenState();
}

class _StudentScanAttendanceScreenState
    extends ConsumerState<StudentScanAttendanceScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _processing = false;
  bool _success = false;
  bool _alreadyMarked = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_processing || _success || _error != null) return;
    final value = capture.barcodes.isNotEmpty
        ? capture.barcodes.first.rawValue
        : null;
    if (value == null || value.isEmpty) return;

    setState(() => _processing = true);
    try {
      final api = ref.read(apiServiceProvider);
      final result = await scanAttendanceQr(api, value);
      if (!mounted) return;
      // Invalidate providers so dashboard and profile reflect the new attendance immediately
      ref.invalidate(studentProfileProvider);
      ref.invalidate(studentDashboardProvider);
      ref.invalidate(studentAttendanceProvider);
      setState(() {
        _success = true;
        _alreadyMarked = result['alreadyMarked'] == true;
      });
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst('ApiException: ', '');
      setState(() => _error = msg);
      AppToast.showError(context, msg);
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  void _retry() {
    setState(() {
      _success = false;
      _alreadyMarked = false;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final showOverlay = _success || _error != null;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text(
          'Scan Attendance',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: AppColors.primaryDark,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),

          // Viewfinder frame
          if (!showOverlay)
            Center(
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFA87D26), width: 3),
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            ),

          if (!showOverlay)
            Positioned(
              bottom: 48,
              left: 24,
              right: 24,
              child: Text(
                _processing
                    ? 'Checking…'
                    : 'Point your camera at the QR code your teacher is showing',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),

          if (showOverlay)
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: 0.88),
                alignment: Alignment.center,
                child: Center(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            width: 84,
                            height: 84,
                            decoration: BoxDecoration(
                              color: _error != null
                                  ? AppColors.errorLight
                                  : AppColors.successLight,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _error != null
                                  ? Icons.close_rounded
                                  : Icons.check_rounded,
                              color: _error != null
                                  ? AppColors.error
                                  : AppColors.success,
                              size: 44,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            _error != null
                                ? 'Could not mark attendance'
                                : (_alreadyMarked
                                      ? 'Already Marked'
                                      : 'Attendance Marked!'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            _error ??
                                (_alreadyMarked
                                    ? "You've already been marked for today."
                                    : "You're marked Present for today."),
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 14,
                              height: 1.4,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 28),
                          SizedBox(
                            width: double.infinity,
                            height: 48,
                            child: ElevatedButton(
                              onPressed: () {
                                if (_error != null) {
                                  _retry();
                                } else {
                                  final nav = Navigator.of(context);
                                  if (nav.canPop()) nav.pop();
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFA87D26),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: Text(
                                _error != null ? 'Try Again' : 'Done',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
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
        ],
      ),
    );
  }
}
