"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  GraduationCap, 
  Building2, 
  Sparkles,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, initAuth, isLoading: storeLoading } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setLocalError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!password) {
      setLocalError("Please enter your password");
      return;
    }

    setIsSubmitting(true);
    const result = await login(cleanPhone, password);
    setIsSubmitting(false);

    if (result.success) {
      router.push("/dashboard");
    } else {
      setLocalError(result.error || "Invalid phone number or password");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F6F3]">
      {/* ─── LEFT PANEL: Brand & Value (Visible on LG screens) ─── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] bg-[#1F2E27] text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-chalk-teal/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brass-gold/15 blur-3xl pointer-events-none" />

        {/* Top: Logo & Name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-sm">
            <Image
              src="/logo-white.png"
              alt="CampusWeb Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold tracking-tight text-white leading-tight">
              CampusWeb
            </h2>
            <p className="text-xs text-white/60 font-body">Institute Operating System</p>
          </div>
        </div>

        {/* Middle: Value Proposition */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-brass-gold text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-brass-gold" />
            Designed for Modern Coaching
          </div>

          <h1 className="text-3xl xl:text-4xl font-display font-extrabold leading-tight text-white mb-6">
            Run your institute with total clarity and zero paperwork.
          </h1>

          <p className="text-white/70 text-sm xl:text-base leading-relaxed mb-8">
            Access admissions, automated fee collections, student attendance records, and teacher schedules from any laptop or computer.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Real-time Fee Tracking & Instant PDF Receipts</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Batch Timetables & Daily Attendance Analytics</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>100% Secure Cloud Storage with Strict Data Isolation</span>
            </div>
          </div>
        </div>

        {/* Bottom: Trust & Security Seal */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit Bank Grade SSL Encrypted</span>
          </div>
          <span>v1.0 • Web App</span>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Focused Login Form ─── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-12 xl:px-20">
        <div className="w-full max-w-md">
          {/* Mobile-only brand header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-ink-green flex items-center justify-center p-2">
              <Image
                src="/logo-white.png"
                alt="CampusWeb Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-lg font-display font-bold text-ink-green">CampusWeb</span>
              <p className="text-[10px] text-ink-green/60">Institute OS</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl p-8 xl:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/80">
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-ink-green tracking-tight">
                Welcome back 👋
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 font-body">
                Sign in with your registered mobile number to access your institute dashboard.
              </p>
            </div>

            {/* Error Message Alert */}
            {localError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3 animate-fade-in">
                <span className="shrink-0 font-bold text-base leading-none">⚠️</span>
                <span className="leading-relaxed">{localError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-slate-500 border-r border-slate-200 pr-2.5 pointer-events-none text-sm font-medium">
                    <span className="text-base">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                    disabled={isSubmitting}
                    className="w-full pl-24 pr-4 py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-ink-green focus:ring-2 focus:ring-ink-green/10 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-ink-green focus:ring-2 focus:ring-ink-green/10 outline-none transition-all placeholder:text-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-brass-gold hover:text-brass-gold/80 font-medium hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-ink-green hover:bg-[#283d34] text-white text-sm font-semibold rounded-xl shadow-md shadow-ink-green/20 hover:shadow-lg hover:shadow-ink-green/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in to portal...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Note */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                New to CampusWeb?{" "}
                <Link
                  href="/book-demo"
                  className="font-semibold text-ink-green hover:underline inline-flex items-center gap-1"
                >
                  Book a free institute demo →
                </Link>
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-xs text-slate-400">
            <p>Protected by CampusWeb Tenant Isolation Protocol.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

