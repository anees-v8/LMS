import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/management_providers.dart';
import '../../services/api_service.dart';
import 'student_details_screen.dart';

class BatchStudentsScreen extends ConsumerStatefulWidget {
  final int batchId;
  final String batchName;

  const BatchStudentsScreen({
    super.key,
    required this.batchId,
    required this.batchName,
  });

  @override
  ConsumerState<BatchStudentsScreen> createState() =>
      _BatchStudentsScreenState();
}

class _BatchStudentsScreenState extends ConsumerState<BatchStudentsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(batchStudentsProvider(widget.batchId));
    final screenWidth = MediaQuery.of(context).size.width;
    final bool isTablet = screenWidth >= 700;
    final double hPadding = screenWidth >= 900 ? 32 : (screenWidth >= 650 ? 24 : 16);

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
              padding: EdgeInsets.only(
                left: screenWidth >= 650 ? hPadding - 8 : 12.0,
                right: hPadding,
                top: 10.0,
                bottom: 20.0,
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.batchName,
                          style: const TextStyle(
                            fontFamily: 'Playfair Display',
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Enrolled Students',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 13,
                          ),
                        ),
                      ],
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
                child: studentsAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (err, stack) =>
                      Center(child: Text(friendlyErrorMessage(err))),
                  data: (students) {
                    final filteredStudents = students.where((s) {
                      final name = (s['fullName']?.toString() ?? '')
                          .toLowerCase();
                      final phone = (s['phone']?.toString() ?? '')
                          .toLowerCase();
                      final roll = (s['rollNo']?.toString() ?? '')
                          .toLowerCase();
                      return name.contains(_searchQuery.toLowerCase()) ||
                          phone.contains(_searchQuery.toLowerCase()) ||
                          roll.contains(_searchQuery.toLowerCase());
                    }).toList();

                    return Column(
                      children: [
                        // Search Bar
                        Padding(
                          padding: EdgeInsets.fromLTRB(hPadding, 16.0, hPadding, 12.0),
                          child: Center(
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 800),
                              child: Container(
                                height: 48,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.shade300),
                                ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.search,
                                  color: Colors.grey.shade500,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: (val) =>
                                        setState(() => _searchQuery = val),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: Color(0xFF1F2E27),
                                    ),
                                    decoration: InputDecoration(
                                      hintText:
                                          'Search by name, roll no or phone...',
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      filled: false,
                                      fillColor: Colors.transparent,
                                      hintStyle: TextStyle(
                                        fontSize: 13,
                                        color: Colors.grey.shade500,
                                      ),
                                      isDense: true,
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                        vertical: 12,
                                      ),
                                    ),
                                  ),
                                ),
                                if (_searchQuery.isNotEmpty)
                                  IconButton(
                                    icon: const Icon(
                                      Icons.clear,
                                      size: 18,
                                      color: Colors.grey,
                                    ),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                        // Students List
                        Expanded(
                          child: filteredStudents.isEmpty
                              ? const Center(child: Text('No students found.'))
                              : isTablet
                                  ? GridView.builder(
                                      padding: EdgeInsets.fromLTRB(
                                        hPadding,
                                        8,
                                        hPadding,
                                        80,
                                      ),
                                      gridDelegate:
                                          const SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: 2,
                                        crossAxisSpacing: 16,
                                        mainAxisSpacing: 12,
                                        mainAxisExtent: 88,
                                      ),
                                      itemCount: filteredStudents.length,
                                      itemBuilder: (context, index) {
                                        final student = filteredStudents[index]
                                            as Map<String, dynamic>;
                                        return _buildStudentCard(
                                          context,
                                          student,
                                        );
                                      },
                                    )
                                  : ListView.builder(
                                      padding: EdgeInsets.fromLTRB(
                                        hPadding,
                                        8,
                                        hPadding,
                                        80,
                                      ),
                                      itemCount: filteredStudents.length,
                                      itemBuilder: (context, index) {
                                        final student = filteredStudents[index]
                                            as Map<String, dynamic>;
                                        return Padding(
                                          padding: const EdgeInsets.only(
                                            bottom: 12,
                                          ),
                                          child: _buildStudentCard(
                                            context,
                                            student,
                                          ),
                                        );
                                      },
                                    ),
                        ),
                      ],
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

  Widget _buildStudentCard(
    BuildContext context,
    Map<String, dynamic> student,
  ) {
    final String name = student['fullName'] ?? 'Unknown';
    final String initials = name
        .split(' ')
        .take(2)
        .map((e) => e.isNotEmpty ? e[0] : '')
        .join()
        .toUpperCase();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(
              alpha: 0.02,
            ),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => StudentDetailsScreen(
                  student: student,
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: const Color(
                    0xFF2E6656,
                  ).withValues(alpha: 0.1),
                  child: Text(
                    initials.isNotEmpty ? initials : '?',
                    style: const TextStyle(
                      color: Color(0xFF2E6656),
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: Color(
                            0xFF1F2E27,
                          ),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Roll: ${student['rollNo'] ?? 'N/A'} • ${student['grade'] ?? ''}',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Icon(
                            Icons.phone_outlined,
                            size: 12,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              student['phone']?.toString() ??
                                  student['parentPhone']?.toString() ??
                                  'N/A',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 12,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right,
                  color: Colors.grey,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
