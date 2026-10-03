import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../services/push_notification_service.dart';
import '../utils/constants.dart';

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final String? error;
  final String? userRole;
  final String? tenantSlug;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? instituteName;
  final String? avatarUrl;
  final bool needsTermsAcceptance;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
    this.userRole,
    this.tenantSlug,
    this.fullName,
    this.email,
    this.phone,
    this.instituteName,
    this.avatarUrl,
    this.needsTermsAcceptance = false,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    String? error,
    String? userRole,
    String? tenantSlug,
    String? fullName,
    String? email,
    String? phone,
    String? instituteName,
    String? avatarUrl,
    bool? needsTermsAcceptance,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error,
      userRole: userRole ?? this.userRole,
      tenantSlug: tenantSlug ?? this.tenantSlug,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      instituteName: instituteName ?? this.instituteName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      needsTermsAcceptance: needsTermsAcceptance ?? this.needsTermsAcceptance,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  late ApiService _api;

  @override
  AuthState build() {
    _api = ref.watch(apiServiceProvider);
    return AuthState();
  }

  /// Reads whatever was cached from the last successful login/session
  /// restore, so the UI has something to show immediately while
  /// `restoreSession()` confirms the token is still valid.
  Future<void> hydrateFromCache() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null) return;
    state = state.copyWith(
      userRole: prefs.getString('user_role'),
      tenantSlug: prefs.getString('tenant_slug'),
      fullName: prefs.getString('full_name'),
      email: prefs.getString('email'),
      phone: prefs.getString('phone'),
      instituteName: prefs.getString('institute_name'),
      avatarUrl: prefs.getString('avatar_url'),
    );
  }

  /// [acceptedTerms] is true only when the login screen showed the "accept
  /// Privacy Policy & Terms" checkbox (i.e. this phone hadn't accepted the
  /// current version yet) AND the user checked it. When true, the
  /// acceptance is recorded right after a successful login — same
  /// button-press, no separate screen or extra step for the user.
  Future<bool> login(
    String phone,
    String password, {
    bool acceptedTerms = false,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _api.post('/auth/login', {
        'phone': phone,
        'password': password,
      });
      final accessToken = response['accessToken'];
      if (accessToken == null) {
        throw Exception('Token missing from response');
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', accessToken);
      if (response['refreshToken'] != null) {
        await prefs.setString('refresh_token', response['refreshToken']);
      }

      await _applyUserAndTenant(response['user'], response['tenant']);

      if (acceptedTerms && state.needsTermsAcceptance) {
        await acceptTerms();
      }

      // Sync FCM token with backend
      await PushNotificationService().sendTokenToBackend();

      state = state.copyWith(isLoading: false, isAuthenticated: true);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  /// Validates a previously-stored token against `GET /auth/me` (also
  /// refreshes cached role/institute info). Used on app start so a user
  /// with a still-valid session skips the login screen entirely.
  ///
  /// Only a real server rejection (401/403 — token actually invalid or
  /// expired) logs the user out. A network-level failure (no internet, DNS,
  /// timeout) does NOT log out: the device may simply be offline, and the
  /// already-cached screens (via `ApiService.cachedGet`) are meant to stay
  /// usable in that case, so we keep the session (and cache) intact and let
  /// the app proceed using whatever was hydrated from cache.
  Future<bool> restoreSession() async {
    try {
      final me = await _api.get('/auth/me');
      await _applyUserAndTenant(me['user'], me['tenant']);

      // Sync FCM token with backend in case it changed while app was killed
      PushNotificationService().sendTokenToBackend();

      state = state.copyWith(isAuthenticated: true);
      return true;
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await logout();
        return false;
      }
      // Some other server-side error (5xx, etc.) — don't wipe the session
      // over a transient backend issue; let cached screens keep working.
      state = state.copyWith(isAuthenticated: true);
      return true;
    } on SocketException catch (_) {
      // No internet / DNS failure — stay "logged in" with cached data.
      state = state.copyWith(isAuthenticated: true);
      return true;
    } catch (_) {
      // Any other unexpected failure (e.g. timeout) — treat the same as
      // offline rather than destroying a possibly-valid session.
      state = state.copyWith(isAuthenticated: true);
      return true;
    }
  }

  Future<void> _applyUserAndTenant(dynamic user, dynamic tenant) async {
    final prefs = await SharedPreferences.getInstance();

    String? userRole;
    String? fullName;
    String? email;
    String? phone;
    String? avatarUrl;
    // Derived fresh from the server's response every call (login and
    // restoreSession both go through here) — never cached locally, since
    // the DB is the source of truth for whether this user has accepted the
    // CURRENT version, not the device.
    bool needsTermsAcceptance = false;
    if (user is Map) {
      userRole = user['role']?.toString();
      fullName = user['fullName']?.toString();
      email = user['email']?.toString();
      phone = user['phone']?.toString();
      avatarUrl = user['avatarUrl']?.toString();
      needsTermsAcceptance =
          user['termsVersion']?.toString() != Constants.currentTermsVersion;
      if (userRole != null) await prefs.setString('user_role', userRole);
      if (fullName != null) await prefs.setString('full_name', fullName);
      if (email != null) await prefs.setString('email', email);
      if (phone != null) await prefs.setString('phone', phone);
      if (avatarUrl != null) await prefs.setString('avatar_url', avatarUrl);
    }

    String? tenantSlug;
    String? instituteName;
    if (tenant is Map) {
      tenantSlug = tenant['slug']?.toString();
      instituteName = tenant['name']?.toString();
      if (tenantSlug != null) await prefs.setString('tenant_slug', tenantSlug);
      if (instituteName != null)
        await prefs.setString('institute_name', instituteName);
    }

    state = state.copyWith(
      userRole: userRole,
      fullName: fullName,
      email: email,
      phone: phone,
      avatarUrl: avatarUrl,
      tenantSlug: tenantSlug,
      instituteName: instituteName,
      needsTermsAcceptance: needsTermsAcceptance,
    );
  }

  /// Records that the current user has accepted the current Privacy
  /// Policy/Terms version. The backend stamps its own server-side version
  /// (never a client-supplied one), so this just needs to succeed and then
  /// clear the local flag — no data to send.
  Future<void> acceptTerms() async {
    await _api.post('/auth/accept-terms', {});
    state = state.copyWith(needsTermsAcceptance: false);
  }

  /// Uploads happen client-side (Cloudinary) first; this just tells the
  /// backend the resulting URL and updates local state so every screen
  /// watching [authProvider] reflects the new photo immediately.
  Future<void> updateAvatarUrl(String avatarUrl) async {
    final result = await _api.patch('/auth/avatar', {'avatarUrl': avatarUrl});
    final saved =
        (result['user'] as Map?)?['avatarUrl']?.toString() ?? avatarUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('avatar_url', saved);
    state = state.copyWith(avatarUrl: saved);
  }

  Future<void> logout() async {
    // Unregister device token from backend before clearing the auth token
    await PushNotificationService().removeTokenFromBackend();

    // Clear SQLite cache so cached data from this account is
    // not visible if a different account logs in next.
    await CacheService.instance.clearAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');
    await prefs.remove('user_role');
    await prefs.remove('tenant_slug');
    await prefs.remove('full_name');
    await prefs.remove('email');
    await prefs.remove('phone');
    await prefs.remove('institute_name');
    await prefs.remove('avatar_url');
    state = AuthState();
  }
}
