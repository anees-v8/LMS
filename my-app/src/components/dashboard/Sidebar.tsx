"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  Shield,
  Sparkles,
  CalendarCheck,
  Megaphone,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/students", icon: Users },
  { label: "Teachers", href: "/teachers", icon: GraduationCap },
  { label: "Batches", href: "/batches", icon: BookOpen },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Fees & Receipts", href: "/fees", icon: CreditCard },
  { label: "Announcements", href: "/notifications", icon: Megaphone },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Subscription & Plans", href: "/subscription", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({
  isMobileOpen,
  onCloseMobile,
}: {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuthStore();

  const instituteName = tenant?.name || "Institute Dashboard";

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 w-64 bg-[#1F2E27] text-white z-50 flex flex-col transition-transform duration-200 ease-in-out border-r border-white/5 print:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Top: Logo & Institute Name */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-2 shrink-0 border border-white/10 group-hover:bg-white/15 transition-colors">
              <Image
                src="/logo-white.png"
                alt="Campus Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold font-display text-white tracking-tight truncate leading-snug">
                {instituteName}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-brass-gold font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="truncate">Admin Portal</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Main Menu
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group",
                  isActive
                    ? "bg-white/15 text-white font-semibold shadow-xs"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? "text-brass-gold" : "text-white/60 group-hover:text-white"
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-brass-gold shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Card & Logout */}
        <div className="p-3 border-t border-white/10 bg-black/15">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-lg bg-chalk-teal text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase overflow-hidden shadow-2xs">
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
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.fullName || "Administrator"}
              </p>
              <p className="text-[10px] text-white/50 truncate font-mono">
                {user?.phone ? `+91 ${user.phone}` : "Admin"}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-white/50 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

