import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme/app_colors.dart';
import '../../providers/teacher_providers.dart';
import '../../services/api_service.dart';

/// Teacher generates a time-limited QR code for a batch; students scan it
/// (see [StudentScanAttendanceScreen]) to mark themselves present within
/// the window. Expiry is enforced server-side — this screen's countdown
/// is just a display, not the source of truth.
/// Shows a modern bottom sheet drawer to pick the validity duration for the QR code
Future<int?> showQrDurationDrawer(
  BuildContext context, {
  required String batchName,
  int initialMinutes = 10,
}) {
  return showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => QrDurationDrawer(
      batchName: batchName,
      initialMinutes: initialMinutes,
    ),
  );
}

class QrDurationDrawer extends StatefulWidget {
  final String batchName;
  final int initialMinutes;

  const QrDurationDrawer({
    super.key,
    required this.batchName,
    this.initialMinutes = 10,
  });

  @override
  State<QrDurationDrawer> createState() => _QrDurationDrawerState();
}

class _QrDurationDrawerState extends State<QrDurationDrawer> {
  late int _selectedMinutes;

  @override
  void initState() {
    super.initState();
    _selectedMinutes = widget.initialMinutes;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 28,
        left: 20,
        right: 20,
        top: 12,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Icon badge
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.qr_code_2_rounded,
              size: 30,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Generate Attendance QR',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.batchName,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),

          // Dropdown Label
          const Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Select Validity Window',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primaryDark,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // The Dropdown menu
          DropdownButtonFormField<int>(
            initialValue: _selectedMinutes,
            isExpanded: true,
            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.primaryDark),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.timer_outlined, color: AppColors.primary, size: 20),
              filled: true,
              fillColor: AppColors.background,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
            items: const [
              DropdownMenuItem(value: 5, child: Text('5 minutes (Quick Scan)')),
              DropdownMenuItem(value: 10, child: Text('10 minutes (Recommended)')),
              DropdownMenuItem(value: 15, child: Text('15 minutes (Standard)')),
              DropdownMenuItem(value: 30, child: Text('30 minutes (Extended)')),
              DropdownMenuItem(value: 45, child: Text('45 minutes (Lecture Window)')),
              DropdownMenuItem(value: 60, child: Text('60 minutes (1 Hour)')),
            ],
            onChanged: (val) {
              if (val != null) setState(() => _selectedMinutes = val);
            },
          ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Students can scan this QR code within $_selectedMinutes minutes to automatically mark their attendance.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () => Navigator.pop(context, _selectedMinutes),
              icon: const Icon(Icons.qr_code_rounded, color: Colors.white),
              label: const Text(
                'Generate QR Code',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFA87D26),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class TeacherQrAttendanceScreen extends ConsumerStatefulWidget {
  final int batchId;
  final String batchName;
  final int subjectId;
  final int? batchScheduleId;
  final int? initialMinutes;
  final bool autoGenerate;

  const TeacherQrAttendanceScreen({
    super.key,
    required this.batchId,
    required this.batchName,
    required this.subjectId,
    this.batchScheduleId,
    this.initialMinutes,
    this.autoGenerate = false,
  });

  @override
  ConsumerState<TeacherQrAttendanceScreen> createState() =>
      _TeacherQrAttendanceScreenState();
}

class _TeacherQrAttendanceScreenState
    extends ConsumerState<TeacherQrAttendanceScreen> {
  int _selectedMinutes = 10;
  int? _sessionId;
  String? _token;
  DateTime? _expiresAt;
  bool _generating = false;
  String? _error;

  Duration _remaining = Duration.zero;
  Timer? _tickTimer;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialMinutes != null) {
      _selectedMinutes = widget.initialMinutes!;
    }
    if (widget.autoGenerate) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _generate();
      });
    }
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _generate() async {
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      final api = ref.read(apiServiceProvider);
      final result = await createQrAttendanceSession(
        api,
        batchId: widget.batchId,
        subjectId: widget.subjectId,
        batchScheduleId: widget.batchScheduleId,
        validForMinutes: _selectedMinutes,
      );
      final expiresAt = DateTime.parse(result['expiresAt'] as String).toLocal();
      setState(() {
        _sessionId = result['id'] as int;
        _token = result['token'] as String;
        _expiresAt = expiresAt;
        _remaining = expiresAt.difference(DateTime.now());
      });
      _startTimers();
    } catch (e) {
      setState(() => _error = friendlyErrorMessage(e));
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _startTimers() {
    _tickTimer?.cancel();
    _tickTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _expiresAt == null) return;
      final remaining = _expiresAt!.difference(DateTime.now());
      setState(
        () => _remaining = remaining.isNegative ? Duration.zero : remaining,
      );
      if (remaining.isNegative) {
        _tickTimer?.cancel();
        _pollTimer?.cancel();
      }
    });
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || _sessionId == null) return;
      ref.invalidate(qrSessionStatusProvider(_sessionId!));
    });
  }

  void _startOver() {
    _tickTimer?.cancel();
    _pollTimer?.cancel();
    setState(() {
      _sessionId = null;
      _token = null;
      _expiresAt = null;
      _error = null;
    });
  }

  String _formatRemaining(Duration d) {
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'QR Attendance: ${widget.batchName}',
          style: const TextStyle(color: Colors.white, fontSize: 15),
        ),
        backgroundColor: AppColors.primaryDark,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (_token != null)
            IconButton(
              tooltip: 'Reset QR Session',
              icon: const Icon(Icons.refresh_rounded, color: Colors.white),
              onPressed: _startOver,
            ),
        ],
      ),
      body: _token == null ? _buildSetup() : _buildSession(),
    );
  }

  Widget _buildSetup() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.qr_code_2_rounded,
                  size: 34,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Generate Attendance QR',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Students scan this within the validity window to mark attendance.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const SizedBox(height: 20),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Validity Duration',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: AppColors.primaryDark,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                initialValue: _selectedMinutes,
                isExpanded: true,
                icon: const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: AppColors.primaryDark,
                ),
                decoration: InputDecoration(
                  prefixIcon: const Icon(
                    Icons.timer_outlined,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  filled: true,
                  fillColor: AppColors.background,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                ),
                items: const [
                  DropdownMenuItem(
                    value: 5,
                    child: Text('5 minutes (Quick Scan)',
                        overflow: TextOverflow.ellipsis),
                  ),
                  DropdownMenuItem(
                    value: 10,
                    child: Text('10 minutes (Recommended)',
                        overflow: TextOverflow.ellipsis),
                  ),
                  DropdownMenuItem(
                    value: 15,
                    child: Text('15 minutes (Standard)',
                        overflow: TextOverflow.ellipsis),
                  ),
                  DropdownMenuItem(
                    value: 30,
                    child: Text('30 minutes (Extended)',
                        overflow: TextOverflow.ellipsis),
                  ),
                  DropdownMenuItem(
                    value: 45,
                    child: Text('45 minutes (Lecture Window)',
                        overflow: TextOverflow.ellipsis),
                  ),
                  DropdownMenuItem(
                    value: 60,
                    child: Text('60 minutes (1 Hour)',
                        overflow: TextOverflow.ellipsis),
                  ),
                ],
                onChanged: (val) {
                  if (val != null) setState(() => _selectedMinutes = val);
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.errorLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: AppColors.error, fontSize: 13),
                  ),
                ),
              ],
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _generating ? null : _generate,
                  icon: const Icon(Icons.qr_code_rounded,
                      color: Colors.white, size: 20),
                  label: _generating
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'Generate QR Code',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFA87D26),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSession() {
    final isExpired = _remaining == Duration.zero;
    final statusAsync = _sessionId != null
        ? ref.watch(qrSessionStatusProvider(_sessionId!))
        : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                if (isExpired)
                  Container(
                    width: 220,
                    height: 220,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.timer_off_rounded,
                          color: Colors.grey.shade400,
                          size: 40,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'QR Expired',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  QrImageView(
                    data: _token!,
                    size: 220,
                    backgroundColor: Colors.white,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: AppColors.primaryDark,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: AppColors.primaryDark,
                    ),
                  ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isExpired
                        ? AppColors.errorLight
                        : AppColors.successLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.timer_outlined,
                        size: 16,
                        color: isExpired ? AppColors.error : AppColors.success,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isExpired
                            ? 'Expired'
                            : 'Expires in ${_formatRemaining(_remaining)}',
                        style: TextStyle(
                          color: isExpired
                              ? AppColors.error
                              : AppColors.success,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () async {
                final minutes = await showQrDurationDrawer(
                  context,
                  batchName: widget.batchName,
                  initialMinutes: _selectedMinutes,
                );
                if (minutes != null && mounted) {
                  setState(() => _selectedMinutes = minutes);
                  _generate();
                }
              },
              icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
              label: const Text(
                'Generate New QR',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              statusAsync?.maybeWhen(
                    data: (s) =>
                        'Scanned (${s['scannedCount']}/${s['totalStudents']})',
                    orElse: () => 'Scanned',
                  ) ??
                  'Scanned',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.primaryDark,
              ),
            ),
          ),
          const SizedBox(height: 10),
          if (statusAsync != null)
            statusAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
              error: (e, _) => Text(
                friendlyErrorMessage(e),
                style: const TextStyle(color: AppColors.error),
              ),
              data: (status) {
                final scanned =
                    (status['scannedStudents'] as List<dynamic>? ?? []);
                if (scanned.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(
                        'No scans yet',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ),
                  );
                }
                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      for (var i = 0; i < scanned.length; i++) ...[
                        if (i > 0) const Divider(height: 1, indent: 56),
                        ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 2,
                          ),
                          leading: const CircleAvatar(
                            backgroundColor: AppColors.successLight,
                            child: Icon(
                              Icons.check_rounded,
                              color: AppColors.success,
                              size: 18,
                            ),
                          ),
                          title: Text(
                            scanned[i]['name'] ?? 'Student',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
