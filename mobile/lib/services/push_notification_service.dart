import 'dart:convert';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_colors.dart';
import 'api_service.dart';
import '../main.dart' show rootProviderContainer;
import '../providers/management_providers.dart'
    show notificationsProvider, unreadNotificationCountProvider;
import '../providers/student_providers.dart'
    show studentNotificationsProvider, studentUnreadNotificationCountProvider;
import '../providers/teacher_providers.dart'
    show teacherNotificationsProvider, teacherUnreadNotificationCountProvider;

// Screens
import '../screens/superadmin/notifications_screen.dart' as superadmin;
import '../screens/notifications/admin_notifications_screen.dart';
import '../screens/notifications/teacher_notifications_screen.dart';
import '../screens/student/student_notifications_screen.dart';

// Background message handler must be a top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // If you're going to use other Firebase services in the background, such as Firestore,
  // make sure you call `Firebase.initializeApp()` before using other Firebase services.
  debugPrint("Handling a background message: ${message.messageId}");
}

class PushNotificationService {
  static final PushNotificationService _instance =
      PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final ApiService _api = ApiService();

  GlobalKey<NavigatorState>? _navigatorKey;

  Future<void> initialize(GlobalKey<NavigatorState> navigatorKey) async {
    _navigatorKey = navigatorKey;

    // 1. Request permissions (Android 13+ & iOS)
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('User granted permission');
    } else {
      debugPrint('User declined or has not accepted permission');
    }

    // 2. Setup Background Handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // 3. Setup Local Notifications (for foreground)
    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_stat_notification'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Handle foreground notification click
        _navigateToNotifications();
      },
    );

    // Create a high importance channel for Android so heads-up works
    if (Platform.isAndroid) {
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel', // id
        'High Importance Notifications', // title
        description:
            'This channel is used for important notifications.', // description
        importance: Importance.max,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(channel);
    }

    // 4. Handle Foreground Messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Got a message whilst in the foreground!');
      debugPrint('Message data: ${message.data}');
      refreshNotificationProviders();

      if (message.notification != null) {
        debugPrint(
          'Message also contained a notification: ${message.notification}',
        );
        _showForegroundNotification(message);
      }
    });

    // 5. Handle clicks when app is in background but NOT killed
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('A new onMessageOpenedApp event was published!');
      refreshNotificationProviders();
      _navigateToNotifications();
    });

    // 6. Handle clicks when app is killed completely and opened via push
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      refreshNotificationProviders();
      // Delay slightly to let the app finish booting before navigating
      Future.delayed(const Duration(milliseconds: 500), () {
        _navigateToNotifications();
      });
    }

    // Optional: get the token initially (we also send this on login)
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        debugPrint("FCM Token: $token");
        // We will send this to backend when the user logs in
      }
    } catch (e) {
      debugPrint("Failed to get FCM token: $e");
    }

    // Listen for token refreshes
    _fcm.onTokenRefresh.listen((newToken) {
      debugPrint("FCM Token refreshed: $newToken");
      sendTokenToBackend(newToken);
    });
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    await _localNotifications.show(
      id: message.hashCode,
      title: message.notification?.title,
      body: message.notification?.body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'high_importance_channel',
          'High Importance Notifications',
          channelDescription:
              'This channel is used for important notifications.',
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_stat_notification',
          color: AppColors.primary,
        ),
        iOS: DarwinNotificationDetails(presentAlert: true, presentSound: true),
      ),
      payload: jsonEncode(message.data),
    );
  }

  /// Invalidates every role's notification list/unread-count providers so
  /// the bell badge and inbox screen reflect a just-arrived push immediately
  /// — plain FutureProviders otherwise keep serving their last-fetched
  /// (now stale) result until something explicitly refetches them.
  void refreshNotificationProviders() {
    rootProviderContainer.invalidate(notificationsProvider);
    rootProviderContainer.invalidate(unreadNotificationCountProvider);
    rootProviderContainer.invalidate(studentNotificationsProvider);
    rootProviderContainer.invalidate(studentUnreadNotificationCountProvider);
    rootProviderContainer.invalidate(teacherNotificationsProvider);
    rootProviderContainer.invalidate(teacherUnreadNotificationCountProvider);
  }

  Future<void> _navigateToNotifications() async {
    if (_navigatorKey?.currentState != null) {
      debugPrint("NAVIGATING TO NOTIFICATIONS PAGE");

      final prefs = await SharedPreferences.getInstance();
      final role = prefs.getString('user_role');

      Widget? screen;
      switch (role) {
        case 'super_admin':
          screen = const superadmin.NotificationsScreen();
          break;
        case 'coaching_admin':
          screen = const AdminNotificationsScreen();
          break;
        case 'teacher':
          screen = const TeacherNotificationsScreen();
          break;
        case 'student':
          screen = const StudentNotificationsScreen();
          break;
      }

      if (screen != null) {
        _navigatorKey!.currentState!.push(
          MaterialPageRoute(builder: (_) => screen!),
        );
      }
    }
  }

  /// Send the FCM token to the backend (call this after successful login)
  Future<void> sendTokenToBackend([String? token]) async {
    try {
      final fcmToken = token ?? await _fcm.getToken();
      if (fcmToken == null) return;

      final platform = Platform.isIOS ? 'ios' : 'android';
      debugPrint("Sending FCM token to backend: $fcmToken ($platform)");

      await _api.post('/auth/device-token', {
        'token': fcmToken,
        'platform': platform,
      });
    } catch (e) {
      debugPrint("Error sending device token to backend: $e");
    }
  }

  /// Unregister device token (call this on logout)
  Future<void> removeTokenFromBackend() async {
    try {
      final fcmToken = await _fcm.getToken();
      if (fcmToken == null) return;

      debugPrint("Removing FCM token from backend");
      // Passing body inside a DELETE request might fail with our simple api_service,
      // but let's try. Wait, api_service delete doesn't support body.
      // We'll update api_service.dart next.
      await _api.delete('/auth/device-token', {'token': fcmToken});
      // Optionally delete local token
      await _fcm.deleteToken();
    } catch (e) {
      debugPrint("Error deleting device token from backend: $e");
    }
  }
}
