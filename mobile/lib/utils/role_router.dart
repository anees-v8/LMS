import 'package:flutter/material.dart';
import '../screens/dashboard/coaching_admin_shell.dart';
import '../screens/dashboard/teacher_shell.dart';
import '../screens/dashboard/unsupported_role_screen.dart';
import '../screens/superadmin/superadmin_shell.dart';
import '../screens/student/student_shell.dart';

/// Single source of truth for "which shell does this role land on" — used by
/// both [SplashScreen] (session restore) and [LoginScreen] (fresh login) so
/// the two never drift out of sync.
Widget homeScreenForRole(String? role) {
  switch (role) {
    case 'super_admin':
      return const SuperAdminShell();
    case 'coaching_admin':
      return const CoachingAdminShell();
    case 'teacher':
      return const TeacherShell();
    case 'student':
      return const StudentShell();
    default:
      return const UnsupportedRoleScreen();
  }
}
