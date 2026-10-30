"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F3]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-ink-green" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading your portal...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F3] print:bg-white flex">
      {/* Fixed Left Sidebar - hidden when printing */}
      <div className="print:hidden">
        <Sidebar
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area (Offset for lg:w-64 sidebar, stripped when printing) */}
      <div className="flex-1 lg:pl-64 print:pl-0 print:m-0 flex flex-col min-w-0">
        <div className="print:hidden">
          <TopNavbar onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
