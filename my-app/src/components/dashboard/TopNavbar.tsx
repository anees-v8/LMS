"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Menu,
  Bell,
  Plus,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  X,
  GraduationCap,
  Phone,
  CheckCircle2,
  CreditCard,
  CalendarCheck,
  Megaphone,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/lib/api/client";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface StudentSearchResult {
  id: number;
  name: string;
  rollNo?: string;
  phone?: string;
  grade?: string;
  batchName?: string;
}

interface NotificationItem {
  id: number;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  type?: string;
  entity_id?: number;
}

function formatTimeAgo(dateStr: string) {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export default function TopNavbar({
  onToggleMobileMenu,
}: {
  onToggleMobileMenu?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tenant, logout } = useAuthStore();

  const handleNewAdmissionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/students") {
      window.dispatchEvent(new CustomEvent("open-new-admission"));
    } else {
      router.push("/students?action=new&t=" + Date.now());
    }
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<StudentSearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<StudentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Menus State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K or Cmd+K to focus search & Esc to close menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get<{ count: number }>("/admin/notifications/unread-count");
      setUnreadCount(res.data?.count || 0);
    } catch {
      // Ignore background error
    }
  };

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await apiClient.get<NotificationItem[]>("/admin/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Poll unread count periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toggle notifications drawer/popover
  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      setShowProfileMenu(false);
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await Promise.allSettled(
        unread.map((n) => apiClient.patch(`/admin/notifications/${n.id}/read`))
      );
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  // Mark single notification as read
  const handleMarkSingleRead = async (item: NotificationItem) => {
    if (item.is_read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await apiClient.patch(`/admin/notifications/${item.id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  // Fetch students once for fast client-side lookup
  const loadStudents = async () => {
    if (allStudents.length > 0) return;
    try {
      setIsSearching(true);
      const res = await apiClient.get("/admin/students");
      const list = Array.isArray(res.data) ? res.data : res.data?.students || [];
      const mapped = list.map((s: any) => ({
        id: s.id,
        name: s.name || s.fullName || "Student",
        rollNo: s.rollNo || s.roll_no || "",
        phone: s.phone || s.parentPhone || "",
        grade: s.grade || "",
        batchName: s.batchName || s.batch_name || "",
      }));
      setAllStudents(mapped);
    } catch {
      // Ignore background search prefetch errors
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.grade && s.grade.toLowerCase().includes(q)) ||
        (s.batchName && s.batchName.toLowerCase().includes(q))
    );
    setFilteredResults(matches.slice(0, 8));
  }, [searchQuery, allStudents]);

  const displayedNotifications =
    notificationFilter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const renderNotificationIcon = (type?: string, title?: string) => {
    const t = (type || title || "").toLowerCase();
    if (t.includes("fee") || t.includes("pay") || t.includes("receipt")) {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes("attend") || t.includes("qr")) {
      return (
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <CalendarCheck className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes("broadcast") || t.includes("notice") || t.includes("announc")) {
      return (
        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>
      );
    }
    if (t.includes("test") || t.includes("quiz") || t.includes("grade")) {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-shadow print:hidden">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
            <span>Good Afternoon, {user?.fullName?.split(" ")[0] || "Educator"}</span>
            <span className="text-brass-gold hidden sm:inline">☀️</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-body">
            {tenant?.name || "Institute Management Portal"}
          </p>
        </div>
      </div>

      {/* Middle: Universal Quick Search (Student / Roll / Phone) */}
      <div ref={searchRef} className="relative hidden md:block w-72 lg:w-96">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => {
              setIsSearchOpen(true);
              loadStudents();
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, roll no, phone..."
            className="w-full pl-9 pr-14 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all font-body"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                ctrl k
              </span>
            )}
          </div>
        </div>

        {/* Live Search Results Popup */}
        {isSearchOpen && (searchQuery.trim() || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Student Directory Search</span>
              {isSearching && (
                <span className="flex items-center gap-1 text-chalk-teal">
                  <span className="w-1.5 h-1.5 rounded-full bg-chalk-teal animate-ping" />
                  Searching...
                </span>
              )}
            </div>

            {filteredResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-body">
                {isSearching ? "Loading student database..." : `No students found matching "${searchQuery}"`}
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {filteredResults.map((s) => (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between transition-colors group cursor-pointer block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-chalk-teal/15 text-chalk-teal font-bold text-xs flex items-center justify-center shrink-0">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-chalk-teal transition-colors">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {s.rollNo && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                              Roll: {s.rollNo}
                            </span>
                          )}
                          {s.batchName && <span>{s.batchName}</span>}
                        </div>
                      </div>
                    </div>
                    {s.phone && (
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-300" />
                        {s.phone}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Quick Action, Notifications & User */}
      <div className="flex items-center gap-2.5">
        {/* + New Admission Button */}
        <button
          type="button"
          onClick={handleNewAdmissionClick}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Admission</span>
        </button>

        {/* ─── Notification Bell with Rich Interactive Popover ─── */}
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={handleToggleNotifications}
            title="Institute Notifications"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Box */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 font-display">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-chalk-teal/10 text-chalk-teal">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-chalk-teal hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Tabs Filter */}
              <div className="flex border-b border-slate-100 px-4 text-xs font-semibold">
                <button
                  onClick={() => setNotificationFilter("all")}
                  className={`py-2 px-2 border-b-2 transition-colors cursor-pointer ${
                    notificationFilter === "all"
                      ? "border-chalk-teal text-chalk-teal"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotificationFilter("unread")}
                  className={`py-2 px-2 border-b-2 transition-colors cursor-pointer ${
                    notificationFilter === "unread"
                      ? "border-chalk-teal text-chalk-teal"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {loadingNotifications ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-chalk-teal mb-2" />
                    <span>Loading notifications...</span>
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No notifications found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {notificationFilter === "unread"
                        ? "You have no unread alerts."
                        : "Alerts for fees, attendance, and tests will appear here."}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkSingleRead(n)}
                      className={`p-3.5 px-4 flex items-start gap-3 transition-colors cursor-pointer ${
                        n.is_read ? "hover:bg-slate-50/70" : "bg-emerald-50/30 hover:bg-emerald-50/50"
                      }`}
                    >
                      {renderNotificationIcon(n.type, n.title)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              n.is_read ? "font-semibold text-slate-800" : "font-bold text-slate-900"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 font-body">
                            {n.body}
                          </p>
                        )}
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-chalk-teal shrink-0 mt-1" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 px-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-chalk-teal font-semibold text-[11px] transition-colors"
                >
                  <Megaphone className="w-3.5 h-3.5 text-brass-gold" />
                  <span>Send Broadcast Announcement</span>
                </Link>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── User Profile Dropdown ─── */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-ink-green text-white font-bold text-xs flex items-center justify-center uppercase overflow-hidden shrink-0 shadow-2xs">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || "Admin"}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.fullName?.slice(0, 2) || "AD"
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {user?.fullName || "Admin"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {tenant?.name || "Institute"}
                </p>
              </div>

              <Link
                href="/settings?tab=profile"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Institute Profile & Logo</span>
              </Link>

              <Link
                href="/subscription"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
                <span>Subscription & Plans</span>
              </Link>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left border-t border-slate-100 mt-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          logout();
        }}
        title="Sign Out?"
        message="You'll need to log in again to access the admin portal."
        confirmText="Yes, Sign Out"
        variant="warning"
      />
    </header>
  );
}
