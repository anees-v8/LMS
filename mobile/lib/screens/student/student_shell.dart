import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_colors.dart';
import '../../providers/student_providers.dart';
import 'student_home_screen.dart';
import 'student_learn_screen.dart';
import 'student_live_screen.dart';
import 'student_tests_screen.dart';
import 'student_profile_screen.dart';

class StudentShell extends ConsumerWidget {
  const StudentShell({super.key});

  final List<Widget> _screens = const [
    StudentHomeScreen(),
    StudentLearnScreen(),
    StudentLiveScreen(),
    StudentTestsScreen(),
    StudentProfileScreen(),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(studentShellTabIndexProvider);

    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: IndexedStack(index: currentIndex, children: _screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: BottomNavigationBar(
            currentIndex: currentIndex,
            onTap: (i) =>
                ref.read(studentShellTabIndexProvider.notifier).setTab(i),
            type: BottomNavigationBarType.fixed,
            backgroundColor: Colors.white,
            selectedItemColor: AppColors.primaryDark,
            unselectedItemColor: AppColors.primary,
            selectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
            unselectedLabelStyle: const TextStyle(fontSize: 11),
            elevation: 0,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_rounded),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.menu_book_rounded),
                label: 'Learn',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.videocam_outlined),
                activeIcon: Icon(Icons.videocam_rounded),
                label: 'Live',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.quiz_rounded),
                label: 'Tests',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.person_rounded),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

