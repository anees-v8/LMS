import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class SelectedAnalyticsMonthNotifier extends Notifier<DateTime> {
  @override
  DateTime build() => DateTime.now();

  void setMonth(DateTime date) {
    state = date;
  }
}

final selectedAnalyticsMonthProvider =
    NotifierProvider<SelectedAnalyticsMonthNotifier, DateTime>(() {
      return SelectedAnalyticsMonthNotifier();
    });

final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final authState = ref.watch(authProvider);
  final selectedMonth = ref.watch(selectedAnalyticsMonthProvider);

  // Determine endpoint based on user role
  String endpoint;
  String? userRole = authState.userRole;

  // If userRole is not yet loaded from provider, try to load from SharedPreferences
  if (userRole == null) {
    final prefs = await SharedPreferences.getInstance();
    userRole = prefs.getString('user_role');
  }

  // Select endpoint based on role
  if (userRole == 'super_admin') {
    // Super admin always needs live data — no caching
    endpoint =
        '/superadmin/analytics?month=${selectedMonth.month}&year=${selectedMonth.year}';
    final response = await api.get(endpoint);
    return response as Map<String, dynamic>;
  } else if (userRole == 'coaching_admin') {
    endpoint =
        '/admin/dashboard?month=${selectedMonth.month}&year=${selectedMonth.year}';
  } else if (userRole == 'student') {
    endpoint = '/student/dashboard';
  } else if (userRole == 'teacher') {
    endpoint = '/teacher/schedule/today';
  } else {
    throw Exception('Unknown role: $userRole');
  }

  // Role-specific cache key (includes month/year for admin)
  final cacheKey = userRole == 'coaching_admin'
      ? 'dashboard_admin_${selectedMonth.month}_${selectedMonth.year}'
      : 'dashboard_$userRole';

  final result = await api.cachedGet(endpoint, cacheKey: cacheKey);
  return result.data as Map<String, dynamic>;
});
