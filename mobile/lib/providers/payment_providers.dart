import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

final subscriptionStatusProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  final api = ref.watch(apiServiceProvider);
  final result = await api.get('/payments/subscription');
  return result as Map<String, dynamic>;
});

/// Public plan catalog (active plans only) — no auth required, same
/// endpoint the marketing site uses. Lets coaching_admin compare plans
/// before deciding whether to switch.
final publicPlansProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final result = await api.get('/public/plans');
  return result as List<dynamic>;
});

Future<Map<String, dynamic>> createPaymentOrder(ApiService api) async {
  final result = await api.post('/payments/create-order', {});
  return result as Map<String, dynamic>;
}

Future<Map<String, dynamic>> verifyPayment(
  ApiService api,
  String orderId,
  String paymentId,
  String? signature,
) async {
  final body = <String, dynamic>{'orderId': orderId, 'paymentId': paymentId};
  if (signature != null) {
    body['signature'] = signature;
  }
  final result = await api.post('/payments/verify', body);
  return result as Map<String, dynamic>;
}

/// Preview the bill for subscribing/upgrading/downgrading to a plan +
/// billing cycle, before any payment is created. Shows proration credit
/// and (for downgrades only) the penalty amount.
Future<Map<String, dynamic>> quotePlanChange(
  ApiService api, {
  required int planCatalogId,
  required String billingCycle,
  int? studentCount,
}) async {
  final result = await api.post('/payments/plan-change/quote', {
    'planCatalogId': planCatalogId,
    'billingCycle': billingCycle,
    if (studentCount != null) 'studentCount': studentCount,
  });
  return result as Map<String, dynamic>;
}

/// Creates a Razorpay order for the prorated+penalty-adjusted amount due.
/// The plan itself is not switched until [confirmPlanChange] verifies payment.
Future<Map<String, dynamic>> requestPlanChange(
  ApiService api, {
  required int planCatalogId,
  required String billingCycle,
  int? studentCount,
}) async {
  final result = await api.post('/payments/plan-change/request', {
    'planCatalogId': planCatalogId,
    'billingCycle': billingCycle,
    if (studentCount != null) 'studentCount': studentCount,
  });
  return result as Map<String, dynamic>;
}

Future<Map<String, dynamic>> confirmPlanChange(
  ApiService api, {
  required int planCatalogId,
  required String billingCycle,
  required String orderId,
  int? studentCount,
  String? paymentId,
  String? signature,
}) async {
  final body = <String, dynamic>{
    'planCatalogId': planCatalogId,
    'billingCycle': billingCycle,
    'orderId': orderId,
    if (studentCount != null) 'studentCount': studentCount,
    if (paymentId != null) 'paymentId': paymentId,
    if (signature != null) 'signature': signature,
  };
  final result = await api.post('/payments/plan-change/confirm', body);
  return result as Map<String, dynamic>;
}
