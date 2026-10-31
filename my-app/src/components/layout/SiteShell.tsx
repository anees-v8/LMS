"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Topbar from "./Topbar";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface SiteShellProps {
  children: React.ReactNode;
}

export default function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();

  // App / Dashboard / Auth routes have their own full-screen layout
  const isAppRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/teachers") ||
    pathname.startsWith("/batches") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/fees") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/receipt") ||
    pathname.startsWith("/student");

  if (isAppRoute) {
    return <main className="min-h-screen bg-paper">{children}</main>;
  }

  return (
    <>
      <Topbar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
