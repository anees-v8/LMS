import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/superadmin_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_textfield.dart';

/// Super Admin composes a notification for coaching_admins — every
/// institute platform-wide, or filtered by city/area.
class BroadcastAdminsScreen extends ConsumerStatefulWidget {
  const BroadcastAdminsScreen({super.key});

  @override
  ConsumerState<BroadcastAdminsScreen> createState() =>
      _BroadcastAdminsScreenState();
}

class _BroadcastAdminsScreenState extends ConsumerState<BroadcastAdminsScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _city = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _error = 'Title is required.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final result = await broadcastToAdmins(
        ref.read(apiServiceProvider),
        title: _title.text.trim(),
        body: _body.text.trim(),
        city: _city.text.trim(),
      );
      if (mounted) {
        final count = result['recipientCount'] ?? 0;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Sent to $count admin(s).')));
        _title.clear();
        _body.clear();
        _city.clear();
        setState(() => _sending = false);
      }
    } catch (e) {
      setState(() {
        _sending = false;
        _error = friendlyErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1F2E27),
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fixed Green Header
            Padding(
              padding: const EdgeInsets.only(
                left: 20.0,
                right: 20.0,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Send Announcement',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Broadcast to every coaching admin',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // White Container
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'This goes to every coaching_admin — across every institute, or just one city.',
                        style: TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(height: 16),
                      CustomTextField(
                        label: 'Title',
                        hint: 'e.g. Platform maintenance tonight',
                        controller: _title,
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        label: 'Message (optional)',
                        hint: 'Details for the admins',
                        controller: _body,
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        label: 'City / Area (optional)',
                        hint: 'Leave empty to reach every institute',
                        prefixIcon: Icons.location_on_outlined,
                        controller: _city,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ],
                      const SizedBox(height: 24),
                      _sending
                          ? const Center(child: CircularProgressIndicator())
                          : SizedBox(
                              height: 52,
                              width: double.infinity,
                              child: CustomButton(
                                text: 'Send',
                                onPressed: _send,
                              ),
                            ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
