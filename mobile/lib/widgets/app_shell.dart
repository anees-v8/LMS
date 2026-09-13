import 'package:flutter/material.dart';

/// One destination in an [AppShell]'s bottom navigation bar. Pass
/// [iconWidget] instead of a plain [icon] when the tab needs a dynamic
/// element (e.g. an unread-count badge).
class NavItem {
  final IconData icon;
  final String label;
  final Widget screen;
  final Widget? iconWidget;

  const NavItem({
    required this.icon,
    required this.label,
    required this.screen,
    this.iconWidget,
  });
}

/// Generic bottom-navigation shell used by every role (Super Admin, Coaching
/// Admin, and future Teacher/Student shells) so navigation stays consistent
/// across the app. Each [NavItem.screen] keeps its own AppBar/FAB — this
/// widget only owns the [IndexedStack] body (state is preserved across tab
/// switches) and the [BottomNavigationBar].
class AppShell extends StatefulWidget {
  final List<NavItem> items;

  const AppShell({super.key, required this.items});

  @override
  State<AppShell> createState() => AppShellState();
}

class AppShellState extends State<AppShell> {
  int _index = 0;

  void switchTab(int i) {
    setState(() {
      _index = i;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      body: IndexedStack(
        index: _index,
        children: widget.items.map((e) => e.screen).toList(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: widget.items
            .map(
              (e) => BottomNavigationBarItem(
                icon: e.iconWidget ?? Icon(e.icon),
                label: e.label,
              ),
            )
            .toList(),
      ),
    );
  }
}
