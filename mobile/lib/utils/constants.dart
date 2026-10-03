import 'package:flutter/material.dart';

class Constants {
  static const String baseUrl = 'https://my-app-tau-umber-67.vercel.app/api';

  static const String privacyPolicyUrl =
      'https://www.campusweb.co.in/legals/privacy-policy';
  static const String termsAndConditionsUrl =
      'https://www.campusweb.co.in/legals/terms-conditions';

  /// Must be bumped by hand, in lockstep with the backend's
  /// CURRENT_TERMS_VERSION (my-app/src/lib/services/auth.service.ts),
  /// whenever the Privacy Policy/Terms content actually changes. A user
  /// whose stored acceptance doesn't match this gets prompted to re-accept
  /// once — not on every login, only when the version actually moves.
  static const String currentTermsVersion = '2026-09-15';

  static const String currencySymbol = '₹';

  /// The "Web application" OAuth client ID from Google Cloud Console —
  /// used as google_sign_in's serverClientId so the backend can exchange
  /// the resulting server auth code for a refresh token. Must match
  /// GOOGLE_OAUTH_CLIENT_ID in the backend's .env.
  static const String googleOAuthWebClientId =
      '618925709812-vvv9jm990fqe35cmj0hkhuc3v7e6igmn.apps.googleusercontent.com';

  /// The app's single fixed theme color — every institute uses the same UI color.
  static const Color defaultPrimaryColor = Color(0xFF1F2E27);
}
