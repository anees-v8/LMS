"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ArrowLeft,
  KeyRound,
  Sparkles,
  Loader2,
  RotateCcw,
  MailCheck,
} from "lucide-react";

type Step = "phone" | "otp" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & timer
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Auto-redirect countdown on success
  useEffect(() => {
    if (step !== "success") return;
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, router]);

  // Focus OTP input on transition to step 'otp'
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit registered mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to process request. Please try again.");
      }

      setTarget(data?.target || `+91 ******${cleanPhone.slice(-4)}`);
      setStep("otp");
      setResendCountdown(60);
      setSuccessInfo("Verification code dispatched successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isResending) return;
    setErrorMessage(null);
    setSuccessInfo(null);
    setIsResending(true);

    const cleanPhone = phone.replace(/\D/g, "");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to resend code");
      }

      setResendCountdown(60);
      setSuccessInfo("A fresh 6-digit code has been sent!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend code";
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-check.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: cleanOtp,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to reset password. Please check the code.");
      }

      setStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F6F3]">
      {/* ─── LEFT PANEL: Brand & Security Overview ─── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] bg-[#1F2E27] text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-chalk-teal/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brass-gold/15 blur-3xl pointer-events-none" />

        {/* Top: Brand Identity */}
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
            <p className="text-xs text-white/60 font-body">Account Recovery Center</p>
          </div>
        </div>

        {/* Middle: Security & Value Proposition */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-brass-gold text-xs font-semibold uppercase tracking-wider mb-6">
            <KeyRound className="w-3.5 h-3.5 text-brass-gold" />
            Zero-Trust Credential Security
          </div>

          <h1 className="text-3xl xl:text-4xl font-display font-extrabold leading-tight text-white mb-6">
            Instant, cryptographic account recovery.
          </h1>

          <p className="text-white/70 text-sm xl:text-base leading-relaxed mb-8">
            Recover access to your institute portal securely. Every reset code is cryptographically hashed with bcrypt and expires within 10 minutes.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Multi-channel OTP Delivery via Resend & SMS</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Brute-force Protected (Max 5 attempts & 15m rate-limiting)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Single-use Nonces — auto invalidated once consumed</span>
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

      {/* ─── RIGHT PANEL: Forgot Password Flow Card ─── */}
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
            {/* Step Breadcrumb / Indicator */}
            {step !== "success" && (
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === "phone"
                        ? "bg-ink-green text-white shadow-sm shadow-ink-green/20"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {step === "otp" ? "✓" : "1"}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Mobile Verify</span>
                </div>

                <div className="w-10 h-0.5 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === "otp"
                        ? "bg-ink-green text-white shadow-sm shadow-ink-green/20"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    2
                  </div>
                  <span className="text-xs font-semibold text-slate-500">New Password</span>
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3 animate-fade-in">
                <span className="shrink-0 font-bold text-base leading-none">⚠️</span>
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Success Info Alert */}
            {successInfo && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3 animate-fade-in">
                <span className="shrink-0 font-bold text-base leading-none">✓</span>
                <span className="leading-relaxed">{successInfo}</span>
              </div>
            )}

            {/* ══════════════ STEP 1: PHONE NUMBER ══════════════ */}
            {step === "phone" && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-display font-bold text-ink-green tracking-tight">
                    Reset Password 🔐
                  </h2>
                  <p className="text-sm text-slate-500 mt-1.5 font-body leading-relaxed">
                    Enter the registered mobile number associated with your administrator or teacher account.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Registered Mobile Number
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
                        autoFocus
                        className="w-full pl-24 pr-4 py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-ink-green focus:ring-2 focus:ring-ink-green/10 outline-none transition-all placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-ink-green hover:bg-[#283d34] text-white text-sm font-semibold rounded-xl shadow-md shadow-ink-green/20 hover:shadow-lg hover:shadow-ink-green/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sending verification code...</span>
                      </>
                    ) : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-ink-green hover:underline inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to login</span>
                  </Link>
                </div>
              </>
            )}

            {/* ══════════════ STEP 2: OTP & NEW PASSWORD ══════════════ */}
            {step === "otp" && (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Step 2 of 2
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone");
                        setErrorMessage(null);
                        setSuccessInfo(null);
                      }}
                      className="text-xs font-medium text-ink-green hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Change number</span>
                    </button>
                  </div>

                  <h2 className="text-2xl font-display font-bold text-ink-green tracking-tight">
                    Verify & Set Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 font-body leading-relaxed">
                    We dispatched a 6-digit verification code to{" "}
                    <strong className="text-slate-800 font-semibold">{target}</strong>.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* OTP Code Field */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        6-Digit OTP Code
                      </label>
                      {resendCountdown > 0 ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Resend in <span className="font-mono font-semibold text-slate-600">{resendCountdown}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResending}
                          className="text-[11px] text-brass-gold hover:text-brass-gold/80 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isResending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>Resend OTP</span>
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        ref={otpInputRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        disabled={isSubmitting}
                        className="w-full text-center py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-xl font-bold font-mono tracking-[0.4em] rounded-xl border border-slate-200 focus:border-ink-green focus:ring-2 focus:ring-ink-green/10 outline-none transition-all placeholder:text-slate-300"
                        required
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      New Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
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
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        disabled={isSubmitting}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-200 focus:border-ink-green focus:ring-2 focus:ring-ink-green/10 outline-none transition-all placeholder:text-slate-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Match Indicator */}
                  {newPassword && confirmPassword && (
                    <div className="text-[11px] font-medium flex items-center gap-1.5 pt-1">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                        </span>
                      ) : (
                        <span className="text-red-500">⚠️ Passwords do not match yet</span>
                      )}
                    </div>
                  )}

                  {/* Submit Reset Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 px-4 bg-ink-green hover:bg-[#283d34] text-white text-sm font-semibold rounded-xl shadow-md shadow-ink-green/20 hover:shadow-lg hover:shadow-ink-green/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying & updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password & Secure Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-slate-500 hover:text-ink-green inline-flex items-center gap-1"
                  >
                    <span>Cancel and return to sign in</span>
                  </Link>
                </div>
              </>
            )}

            {/* ══════════════ STEP 3: SUCCESS ══════════════ */}
            {step === "success" && (
              <div className="text-center py-4 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h2 className="text-2xl font-display font-bold text-ink-green tracking-tight mb-2">
                  Password Updated! 🎉
                </h2>

                <p className="text-sm text-slate-600 font-body leading-relaxed mb-6">
                  Your credentials have been securely updated. You can now access your institute management dashboard with your new password.
                </p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 mb-6 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-green" />
                  <span>
                    Auto-redirecting to login in{" "}
                    <strong className="text-slate-800 font-bold">{redirectCountdown}s</strong>...
                  </span>
                </div>

                <Link
                  href="/login"
                  className="w-full py-3.5 px-4 bg-ink-green hover:bg-[#283d34] text-white text-sm font-semibold rounded-xl shadow-md shadow-ink-green/20 hover:shadow-lg hover:shadow-ink-green/30 inline-flex items-center justify-center gap-2 transition-all"
                >
                  <span>Log In to Dashboard Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
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

