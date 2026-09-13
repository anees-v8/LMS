import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

/// Circular avatar with a camera badge — tap it to pick a photo from the
/// device and upload it straight to Cloudinary (same signed-upload flow
/// used for content/quiz images), then persist via [authProvider]. Shared
/// by every role's profile screen so "add a photo" works identically
/// everywhere and updates the whole app the moment it succeeds.
class ProfileAvatar extends ConsumerStatefulWidget {
  final double radius;
  const ProfileAvatar({super.key, this.radius = 41});

  @override
  ConsumerState<ProfileAvatar> createState() => _ProfileAvatarState();
}

class _ProfileAvatarState extends ConsumerState<ProfileAvatar> {
  bool _uploading = false;

  Future<void> _pickAndUpload() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png'],
        withReadStream: true,
        withData: false,
      );
      if (result == null || result.files.isEmpty) return;
      final picked = result.files.first;
      if (picked.size > 5 * 1024 * 1024) {
        _showError('Image must be under 5MB');
        return;
      }

      setState(() => _uploading = true);

      final api = ref.read(apiServiceProvider);
      final sig = await api.get('/auth/upload-signature');
      final cloudName = sig['cloudName'];
      final apiKey = sig['apiKey'];
      if (cloudName == null || apiKey == null) {
        throw Exception('Cloudinary is not configured on the server.');
      }

      final uri = Uri.parse(
        'https://api.cloudinary.com/v1_1/$cloudName/auto/upload',
      );
      final req = http.MultipartRequest('POST', uri)
        ..fields['api_key'] = apiKey.toString()
        ..fields['timestamp'] = sig['timestamp'].toString()
        ..fields['signature'] = sig['signature']
        ..fields['folder'] = sig['folder'];

      final file = File(picked.path!);
      final length = await file.length();
      req.files.add(
        http.MultipartFile(
          'file',
          file.openRead(),
          length,
          filename: picked.name,
        ),
      );

      final streamed = await req.send();
      final res = await http.Response.fromStream(streamed);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = jsonDecode(res.body);
        await ref
            .read(authProvider.notifier)
            .updateAvatarUrl(data['secure_url'] as String);
      } else {
        throw Exception('Upload failed (${res.statusCode})');
      }
    } catch (e) {
      _showError('Could not update photo: ${friendlyErrorMessage(e)}');
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final avatarUrl = ref.watch(authProvider).avatarUrl;
    final size = widget.radius * 2;

    return SizedBox(
      width: size + 8,
      height: size + 8,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.15),
              border: Border.all(color: const Color(0xFFA87D26), width: 3),
              image: avatarUrl != null && avatarUrl.isNotEmpty
                  ? DecorationImage(
                      image: NetworkImage(avatarUrl),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: avatarUrl == null || avatarUrl.isEmpty
                ? Icon(
                    Icons.person_rounded,
                    color: Colors.white,
                    size: widget.radius * 1.05,
                  )
                : null,
          ),
          if (_uploading)
            Container(
              width: size,
              height: size,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black45,
              ),
              child: const Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2,
                  ),
                ),
              ),
            ),
          Positioned(
            bottom: 0,
            right: 0,
            child: GestureDetector(
              onTap: _uploading ? null : _pickAndUpload,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFA87D26),
                  border: Border.all(color: const Color(0xFF1F2E27), width: 2),
                ),
                child: const Icon(
                  Icons.camera_alt_rounded,
                  color: Colors.white,
                  size: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
