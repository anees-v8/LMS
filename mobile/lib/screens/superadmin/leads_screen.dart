import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/superadmin_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/custom_dropdown.dart';

const List<String> _statuses = ['new', 'contacted', 'converted', 'lost'];

/// Super Admin's "Leads" tab — demo-booking inbox. `LeadListItem`:
/// {id, ownerName, instituteName, phone, city, studentCount, message,
/// status, isRead, notified, createdAt}.
class LeadsScreen extends ConsumerWidget {
  const LeadsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leadsAsync = ref.watch(leadsProvider);

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
                    'Leads',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Demo booking requests from the website',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // White Container with fixed parts and scrollable list
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFFF4F6F3),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                ),
                child: leadsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (leads) {
                    if (leads.isEmpty) {
                      return const Center(child: Text('No leads yet.'));
                    }
                    return RefreshIndicator(
                      onRefresh: () async => ref.invalidate(leadsProvider),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: leads.length,
                        itemBuilder: (context, index) {
                          final lead = leads[index] as Map<String, dynamic>;
                          final isRead = lead['isRead'] == true;
                          final city = lead['city']?.toString();
                          final studentCount = lead['studentCount'];
                          final message = lead['message']?.toString();

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            color: isRead
                                ? null
                                : Colors.blue.withValues(alpha: 0.05),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      if (!isRead)
                                        Container(
                                          width: 8,
                                          height: 8,
                                          margin: const EdgeInsets.only(
                                            right: 8,
                                          ),
                                          decoration: const BoxDecoration(
                                            color: Colors.blue,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      Expanded(
                                        child: Text(
                                          lead['instituteName'] ?? '',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${lead['ownerName'] ?? ''} • ${lead['phone'] ?? ''}',
                                  ),
                                  if (city != null || studentCount != null)
                                    Text(
                                      [
                                        if (city != null && city.isNotEmpty)
                                          city,
                                        if (studentCount != null)
                                          '$studentCount students',
                                      ].join(' • '),
                                      style: TextStyle(
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  if (message != null &&
                                      message.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      message,
                                      style: const TextStyle(
                                        fontStyle: FontStyle.italic,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: CustomDropdown<String>(
                                          label: 'Status',
                                          hint: 'Select a status',
                                          value:
                                              _statuses.contains(lead['status'])
                                              ? lead['status'] as String
                                              : 'new',
                                          options: _statuses
                                              .map(
                                                (s) => DropdownOption<String>(
                                                  value: s,
                                                  label: s,
                                                ),
                                              )
                                              .toList(),
                                          onChanged: (v) async {
                                            if (v == null) return;
                                            try {
                                              await updateLeadStatus(
                                                ref.read(apiServiceProvider),
                                                lead['id'] as int,
                                                v,
                                              );
                                              ref.invalidate(leadsProvider);
                                            } catch (e) {
                                              if (context.mounted) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  SnackBar(
                                                    content: Text(
                                                      friendlyErrorMessage(e),
                                                    ),
                                                    backgroundColor: Colors.red,
                                                  ),
                                                );
                                              }
                                            }
                                          },
                                        ),
                                      ),
                                      if (!isRead) ...[
                                        const SizedBox(width: 8),
                                        TextButton(
                                          onPressed: () async {
                                            await markLeadRead(
                                              ref.read(apiServiceProvider),
                                              lead['id'] as int,
                                            );
                                            ref.invalidate(leadsProvider);
                                            ref.invalidate(
                                              unreadLeadsCountProvider,
                                            );
                                          },
                                          child: const Text('Mark read'),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
