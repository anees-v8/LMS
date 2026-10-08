import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

// ─────────────────────────── Read providers ───────────────────────────
// All endpoints are super_admin-only on the backend (roleGuard('super_admin'))
// — these providers are only ever watched from Super Admin screens.

final tenantsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return await api.get('/superadmin/tenants') as List<dynamic>;
});

final plansProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return await api.get('/superadmin/plans') as List<dynamic>;
});

final subscriptionsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return await api.get('/superadmin/subscriptions') as List<dynamic>;
});

/// `days` mirrors `GET /superadmin/subscriptions/expiring?days=`.
final expiringSubscriptionsProvider = FutureProvider.family<List<dynamic>, int>(
  (ref, days) async {
    final api = ref.watch(apiServiceProvider);
    return await api.get('/superadmin/subscriptions/expiring?days=$days')
        as List<dynamic>;
  },
);

final leadsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return await api.get('/superadmin/leads') as List<dynamic>;
});

final unreadLeadsCountProvider = FutureProvider<int>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final response =
      await api.get('/superadmin/leads/unread-count') as Map<String, dynamic>;
  return response['count'] as int? ?? 0;
});

/// Subscription detail for one tenant — used by the "Assign Plan" dialog.
final tenantSubscriptionProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, tenantId) async {
      final api = ref.watch(apiServiceProvider);
      return await api.get('/superadmin/tenants/$tenantId/subscription')
          as Map<String, dynamic>;
    });

/// Dashboard metrics for a single tenant
final tenantDashboardProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, tenantId) async {
      final api = ref.watch(apiServiceProvider);
      return await api.get('/superadmin/tenants/$tenantId/dashboard')
          as Map<String, dynamic>;
    });

// ─────────────────────────── Write actions ───────────────────────────
// Plain helper functions (not providers) — screens call these directly, then
// `ref.invalidate(...)` the relevant provider above to refetch. Every
// endpoint/method/body shape matches the backend's superadmin validators
// exactly (registerTenantSchema, suspendSchema, createPlanSchema,
// updatePlanSchema, assignPlanSchema, updateLeadStatusSchema).

Future<Map<String, dynamic>> registerTenant(
  ApiService api, {
  required String name,
  required String slug,
  required String adminName,
  required String adminPhone,
  required String adminEmail,
  required String adminPassword,
  String? city,
  String? contactPhone,
}) async {
  final body = <String, dynamic>{
    'name': name,
    'slug': slug,
    'adminName': adminName,
    'adminPhone': adminPhone,
    'adminEmail': adminEmail,
    'adminPassword': adminPassword,
    if (city != null && city.isNotEmpty) 'city': city,
    if (contactPhone != null && contactPhone.isNotEmpty)
      'contactPhone': contactPhone,
  };
  return await api.post('/superadmin/tenants', body) as Map<String, dynamic>;
}

Future<Map<String, dynamic>> setTenantActive(
  ApiService api,
  int tenantId,
  bool isActive,
) async {
  return await api.patch('/superadmin/tenants/$tenantId/suspend', {
        'isActive': isActive,
      })
      as Map<String, dynamic>;
}

Future<Map<String, dynamic>> assignPlanToTenant(
  ApiService api,
  int tenantId, {
  required int planCatalogId,
  required String billingCycle,
  String? billingMode, // 'per_student' (default) | 'flat'
}) async {
  final body = <String, dynamic>{
    'planCatalogId': planCatalogId,
    'billingCycle': billingCycle,
    'billingMode': ?billingMode,
  };
  return await api.put('/superadmin/tenants/$tenantId/subscription', body)
      as Map<String, dynamic>;
}

Future<Map<String, dynamic>> createPlan(
  ApiService api, {
  required String name,
  required int priceMonthly,
  required int priceQuarterly,
  required int priceYearly,
  required int flatPriceMonthly,
  required int flatStudentLimit,
  required List<String> features,
  String? tagline,
  int? displayOrder,
}) async {
  final body = <String, dynamic>{
    'name': name,
    'priceMonthly': priceMonthly,
    'priceQuarterly': priceQuarterly,
    'priceYearly': priceYearly,
    'flatPriceMonthly': flatPriceMonthly,
    'flatStudentLimit': flatStudentLimit,
    'features': features,
    if (tagline != null && tagline.isNotEmpty) 'tagline': tagline,
    'displayOrder': ?displayOrder,
  };
  return await api.post('/superadmin/plans', body) as Map<String, dynamic>;
}

Future<Map<String, dynamic>> updatePlan(
  ApiService api,
  int id, {
  String? tagline,
  int? priceMonthly,
  int? priceQuarterly,
  int? priceYearly,
  int? flatPriceMonthly,
  int? flatStudentLimit,
  List<String>? features,
  bool? isActive,
  int? displayOrder,
}) async {
  final body = <String, dynamic>{
    'tagline': ?tagline,
    'priceMonthly': ?priceMonthly,
    'priceQuarterly': ?priceQuarterly,
    'priceYearly': ?priceYearly,
    'flatPriceMonthly': ?flatPriceMonthly,
    'flatStudentLimit': ?flatStudentLimit,
    'features': ?features,
    'isActive': ?isActive,
    'displayOrder': ?displayOrder,
  };
  return await api.put('/superadmin/plans/$id', body) as Map<String, dynamic>;
}

Future<void> deactivatePlan(ApiService api, int id) async {
  await api.delete('/superadmin/plans/$id');
}

Future<void> markLeadRead(ApiService api, int id) async {
  await api.patch('/superadmin/leads/$id/read', {});
}

Future<Map<String, dynamic>> updateLeadStatus(
  ApiService api,
  int id,
  String status,
) async {
  return await api.patch('/superadmin/leads/$id/status', {'status': status})
      as Map<String, dynamic>;
}

/// Broadcasts a notification to coaching_admins — every institute, or
/// filtered by city. Returns `{recipientCount}`.
Future<Map<String, dynamic>> broadcastToAdmins(
  ApiService api, {
  required String title,
  String? body,
  String? city,
}) async {
  final requestBody = <String, dynamic>{
    'title': title,
    if (body != null && body.isNotEmpty) 'body': body,
    if (city != null && city.isNotEmpty) 'city': city,
  };
  return await api.post('/superadmin/notifications/broadcast', requestBody)
      as Map<String, dynamic>;
}
