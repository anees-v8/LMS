"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Receipt,
  Search,
  CheckCircle2,
  ShieldCheck,
  FileText,
  ArrowRight,
  Sparkles,
  School,
  HelpCircle,
} from "lucide-react";

function StudentFeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [receiptInput, setReceiptInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto redirect if receipt query param is provided
  useEffect(() => {
    const qReceipt =
      searchParams.get("receiptNo") ||
      searchParams.get("receipt") ||
      searchParams.get("id");

    if (qReceipt) {
      router.replace(`/receipt/${encodeURIComponent(qReceipt.trim())}`);
    }
  }, [searchParams, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = receiptInput.trim();
    if (!clean) {
      setError("Please enter a valid receipt number.");
      return;
    }
    setError(null);
    router.push(`/receipt/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F3] flex flex-col font-body">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink-green text-white flex items-center justify-center font-bold font-display text-sm">
            C
          </div>
          <span className="font-display font-bold text-slate-900 text-lg tracking-tight">
            Campus
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Institute Login
          </Link>
        </div>
      </header>

      {/* Hero Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-xl w-full space-y-6">
          {/* Main Search Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center mx-auto shadow-2xs">
              <Receipt className="w-7 h-7" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Fee Receipt Portal</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
                Student Payment Receipt
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Received a fee confirmation via WhatsApp or SMS? Enter your receipt reference number below to view and download your official invoice.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={receiptInput}
                  onChange={(e) => {
                    setReceiptInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. RCPT-3-20261030-PJZI"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-xs sm:text-sm rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all shadow-2xs uppercase placeholder:normal-case"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 text-left px-1">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs sm:text-sm font-semibold shadow-md shadow-ink-green/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <span>View Official Receipt</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Explanation Note */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs text-slate-500 space-y-1.5 font-body">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-chalk-teal" />
                <span>Where do I find my Receipt Reference?</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your receipt reference (e.g. <span className="font-mono font-bold text-slate-800">RCPT-3-XXXX</span>) is included in the instant WhatsApp confirmation and SMS sent when your fees are recorded by your institute.
              </p>
            </div>
          </div>

          {/* Trust Footer */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Digitally Verified</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-chalk-teal" />
              <span>Instant PDF Print</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-brass-gold" />
              <span>Official Institute Record</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StudentFeesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F3] flex items-center justify-center text-xs text-slate-500">
          Loading receipt portal...
        </div>
      }
    >
      <StudentFeesContent />
    </Suspense>
  );
}

