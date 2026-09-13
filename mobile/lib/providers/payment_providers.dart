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
