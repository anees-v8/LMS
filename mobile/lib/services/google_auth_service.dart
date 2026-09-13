import 'package:google_sign_in/google_sign_in.dart';
import '../utils/constants.dart';

/// Thin wrapper around google_sign_in's v7 API for the one thing this app
/// needs it for: getting a one-time server auth code to hand to the
/// backend, so it can create Calendar/Meet events as the signed-in teacher.
class GoogleAuthService {
  static const _calendarScope =
      'https://www.googleapis.com/auth/calendar.events';

  static bool _initialized = false;

  static Future<void> _ensureInitialized() async {
    if (_initialized) return;
    await GoogleSignIn.instance.initialize(
      serverClientId: Constants.googleOAuthWebClientId,
    );
    _initialized = true;
  }

  /// Runs the interactive Google sign-in flow, then requests a server auth
  /// code for Calendar access. Returns null if the user cancels.
  static Future<String?> signInAndGetServerAuthCode() async {
    await _ensureInitialized();

    final GoogleSignInAccount account;
    try {
      account = await GoogleSignIn.instance.authenticate(
        scopeHint: const [_calendarScope],
      );
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return null;
      rethrow;
    }

    final GoogleSignInServerAuthorization? serverAuth = await account
        .authorizationClient
        .authorizeServer(const [_calendarScope]);

    return serverAuth?.serverAuthCode;
  }

  static Future<void> signOut() async {
    await _ensureInitialized();
    await GoogleSignIn.instance.signOut();
  }
}
