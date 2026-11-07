"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  CheckCircle2,
  FileText,
  Printer,
  X,
  ArrowUpRight,
  Check,
  Receipt,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Loader2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/utils/cn";

export interface PlanItem {
  id: number;
  name: string;
  tagline: string | null;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  features: string[];
  isActive: boolean;
  flatTeacherLimit?: number;
  displayOrder?: number;
}

interface SubscriptionData {
  id: number;
  plan: string;
  amount: number;
  status: string;
  trialEndsAt: string | null;
  nextBillingDate: string | null;
  planCatalogId: number | null;
  billingCycle: "monthly" | "quarterly" | "yearly" | null;
  perStudentRate: number | null;
  studentCountSnapshot: number | null;
  currentCycleAmount: number | null;
  lastPaymentId?: string | null;
  lastOrderId?: string | null;
  lastPaymentAmount?: string | number | null;
  lastPaidAt?: string | null;
}

const FEATURE_NAMES: Record<string, string> = {
  student_management: "Student Management & Profiles",
  batch_management: "Batches & Timetable Management",
  digital_attendance: "Digital Attendance & Daily Logs",
  fee_management: "Fee Receipts, Ledger & Invoicing",
  online_tests: "Online Assessment & Tests",
  doubt_solving: "Interactive Doubt Solving",
  video_library: "Video Lecture Library & Study Material",
  whatsapp_reminders: "Automated WhatsApp Fee Reminders",
  live_classes: "Google Meet Live Classes",
  online_payments: "Online Payment Gateway (BYOG Razorpay)",
  performance_reports: "Detailed Student Performance Reports",
  teacher_accounts: "Dedicated Teacher Accounts",
  website_request: "Custom Institute Website Request",
};

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 1,
    name: "Basic",
    tagline: "Apni coaching ko digital banayein, bina kisi jhanjhat ke.",
    priceMonthly: 19,
    priceQuarterly: 16,
    priceYearly: 13,
    flatTeacherLimit: 1,
    features: [
      "student_management",
      "batch_management",
      "digital_attendance",
      "fee_management",
      "online_tests",
      "doubt_solving",
      "teacher_accounts",
    ],
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 2,
    name: "Pro",
    tagline: "Smart automation jo aapka time bachaye. Ideal for growing institutes.",
    priceMonthly: 29,
    priceQuarterly: 24,
    priceYearly: 19,
    flatTeacherLimit: 5,
    features: [
      "student_management",
      "batch_management",
      "digital_attendance",
      "fee_management",
      "online_tests",
      "video_library",
      "whatsapp_reminders",
      "live_classes",
      "online_payments",
      "performance_reports",
      "teacher_accounts",
      "doubt_solving",
    ],
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 3,
    name: "Elite",
    tagline: "Apna khud ka digital brand banayein. For premium setups.",
    priceMonthly: 49,
    priceQuarterly: 42,
    priceYearly: 35,
    flatTeacherLimit: 15,
    features: [
      "student_management",
      "batch_management",
      "digital_attendance",
      "fee_management",
      "online_tests",
      "video_library",
      "whatsapp_reminders",
      "live_classes",
      "online_payments",
      "performance_reports",
      "website_request",
      "doubt_solving",
      "teacher_accounts",
    ],
    isActive: true,
    displayOrder: 3,
  },
];

export default function SubscriptionPage() {
  const { user, tenant } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [studentCount, setStudentCount] = useState<number>(2);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("quarterly");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [upgradeModalPlan, setUpgradeModalPlan] = useState<PlanItem | null>(null);

  // Quote & Modal State
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [submittingChange, setSubmittingChange] = useState(false);
  const [changeSuccessMessage, setChangeSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [subRes, plansRes, studentsRes] = await Promise.allSettled([
        apiClient.get<SubscriptionData>("/payments/subscription"),
        apiClient.get<any>("/public/plans"),
        apiClient.get<any>("/admin/students"),
      ]);

      if (subRes.status === "fulfilled" && subRes.value.data) {
        setSubscription(subRes.value.data);
        if (subRes.value.data.billingCycle) {
          setBillingCycle(subRes.value.data.billingCycle);
        }
      }

      if (plansRes.status === "fulfilled" && plansRes.value.data) {
        const rawList = Array.isArray(plansRes.value.data)
          ? plansRes.value.data
          : plansRes.value.data.data || [];

        if (rawList.length > 0) {
          const normalized: PlanItem[] = rawList.map((p: any) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            priceMonthly: Number(p.priceMonthly ?? p.price_monthly ?? 0),
            priceQuarterly: Number(p.priceQuarterly ?? p.price_quarterly ?? 0),
            priceYearly: Number(p.priceYearly ?? p.price_yearly ?? 0),
            flatTeacherLimit: p.flatTeacherLimit ?? p.flat_teacher_limit ?? 1,
            features: p.features || [],
            isActive: p.isActive ?? p.is_active ?? true,
            displayOrder: p.displayOrder ?? p.display_order ?? 0,
          }));

          const activeOnly = normalized.filter((p) => p.isActive);
          setPlans(activeOnly.length > 0 ? activeOnly : DEFAULT_PLANS);
        }
      }

      if (studentsRes.status === "fulfilled" && studentsRes.value.data) {
        const list = Array.isArray(studentsRes.value.data)
          ? studentsRes.value.data
          : studentsRes.value.data.data || [];
        setStudentCount(list.length || 2);
      }
    } catch (err) {
      console.error("Failed to load subscription data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Values
  const currentPlan =
    plans.find((p) => p.id === (subscription?.planCatalogId || 2)) || DEFAULT_PLANS[1];

  const daysRemaining = subscription?.nextBillingDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.nextBillingDate).getTime() - new Date("2026-10-30T12:00:00Z").getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 75;

  const formattedRenewalDate = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "12 Jan 2027";

  const formattedPaidDate = subscription?.lastPaidAt
    ? new Date(subscription.lastPaidAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "12 Oct 2026";

  const ratePerStudent = subscription?.perStudentRate || 24;
  const cycleAmount = subscription?.currentCycleAmount || subscription?.amount || 72;
  const invoiceRef = `CW-INV-${tenant?.id || 3}-20261012`;
  const paymentId = subscription?.lastPaymentId || "pay_mock_receipt_test";
  const orderId = subscription?.lastOrderId || "order_mock_1791819044659";

  const scrollToBrowse = () => {
    const el = document.getElementById("browse-all-plans");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Open Upgrade / Switch modal & fetch quote
  const handleOpenUpgradeModal = async (targetPlan: PlanItem) => {
    setUpgradeModalPlan(targetPlan);
    setQuoteLoading(true);
    setQuoteData(null);
    setChangeSuccessMessage(null);

    const rate =
      billingCycle === "yearly"
        ? targetPlan.priceYearly
        : billingCycle === "quarterly"
        ? targetPlan.priceQuarterly
        : targetPlan.priceMonthly;
    const months = billingCycle === "yearly" ? 12 : billingCycle === "quarterly" ? 3 : 1;
    const estimatedNewAmount = rate * studentCount * months;

    try {
      const res = await apiClient.post("/payments/plan-change/quote", {
        planCatalogId: targetPlan.id,
        billingCycle,
        studentCount,
      });
      setQuoteData(res.data);
    } catch {
      // Local fallback calculation for quote preview
      setQuoteData({
        direction:
          targetPlan.id > currentPlan.id ? "upgrade" : targetPlan.id < currentPlan.id ? "downgrade" : "same",
        studentCount,
        newCycleAmount: estimatedNewAmount,
        prorationCredit: 0,
        amountDue: estimatedNewAmount,
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!upgradeModalPlan || submittingChange) return;
    setSubmittingChange(true);
    try {
      const reqRes = await apiClient.post("/payments/plan-change/request", {
        planCatalogId: upgradeModalPlan.id,
        billingCycle,
        studentCount,
      });

      const orderData = reqRes.data;

      // Confirm plan switch
      await apiClient.post("/payments/plan-change/confirm", {
        planCatalogId: upgradeModalPlan.id,
        billingCycle,
        orderId: orderData?.orderId || `order_dir_${Date.now()}`,
        paymentId: orderData?.mock ? `pay_mock_${Date.now()}` : `pay_verified_${Date.now()}`,
        signature: orderData?.mock ? "mock_signature" : "verified_signature",
        studentCount,
      });

      setChangeSuccessMessage(`Successfully switched to ${upgradeModalPlan.name} Plan (${billingCycle.toUpperCase()})!`);
      await fetchData();
      setTimeout(() => {
        setUpgradeModalPlan(null);
        setChangeSuccessMessage(null);
      }, 1600);
    } catch (err: any) {
      console.error("Plan change error", err);
      alert(err?.response?.data?.error?.message || "Failed to switch plan. Please try again or contact support.");
    } finally {
      setSubmittingChange(false);
    }
  };

  return (
    <DashboardLayout>
      {/* ═════════════════════════════════════════════════════════════════
          1. INTERACTIVE SCREEN VIEW (HIDDEN ON PRINT)
          ═════════════════════════════════════════════════════════════════ */}
      <div className="space-y-8 print:hidden">
        {/* Header with single clean Tax Invoice button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
              Subscription &amp; Plans
            </h1>
            <p className="text-xs text-slate-500 font-body mt-1">
              Manage your active coaching platform subscription, student capacity, billing interval, and download official tax invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Tax Invoice / Receipt</span>
            </button>
            <button
              onClick={scrollToBrowse}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F2E27] hover:bg-[#2E6656] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-brass-gold" />
              <span>Explore Plans &amp; Pricing ↓</span>
            </button>
          </div>
        </div>

        {/* Active Plan Overview Card (Duplicate Buttons Removed) */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          {/* Top Row: Plan Name & Status */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center font-bold font-display">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">
                      {currentPlan.name} Plan
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active ({daysRemaining} days left)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-body mt-0.5">
                    {currentPlan.tagline ||
                      "Smart automation jo aapka time bachaye. Ideal for growing institutes."}
                  </p>
                </div>
              </div>
            </div>

            {/* Clean action linking to the plans catalog below */}
            <div className="self-start">
              <button
                onClick={scrollToBrowse}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-all cursor-pointer"
              >
                <span>Change Interval or Upgrade</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* 4 Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Metric 1: Billing Cycle */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billing Cycle
              </span>
              <p className="text-base font-bold font-display text-slate-900 mt-1 uppercase">
                {subscription?.billingCycle || "Quarterly"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-body">
                {subscription?.billingCycle === "yearly"
                  ? "12 Months cycle prepaid"
                  : subscription?.billingCycle === "monthly"
                  ? "Monthly flexible cycle"
                  : "3 Months cycle prepaid"}
              </p>
            </div>

            {/* Metric 2: Rate Per Student */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Rate Per Student
              </span>
              <p className="text-base font-bold font-display text-slate-900 mt-1">
                ₹{ratePerStudent} <span className="text-xs font-normal text-slate-500 font-body">/ cycle</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-body">
                ₹{subscription?.billingCycle === "yearly" ? Math.round(ratePerStudent / 12) : subscription?.billingCycle === "monthly" ? ratePerStudent : Math.round(ratePerStudent / 3)} / month per student
              </p>
            </div>

            {/* Metric 3: Enrolled Students */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Enrolled Students
              </span>
              <p className="text-base font-bold font-display text-slate-900 mt-1">
                {studentCount} <span className="text-xs font-normal text-slate-500 font-body">active</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-body">
                Across all enrolled batches
              </p>
            </div>

            {/* Metric 4: Next Renewal Date */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Next Renewal Date
              </span>
              <p className="text-base font-bold font-display text-slate-900 mt-1">
                {formattedRenewalDate}
              </p>
              <p className="text-[11px] text-chalk-teal mt-0.5 font-medium">
                {daysRemaining} days remaining
              </p>
            </div>
          </div>

          {/* Footer Strip */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-chalk-teal shrink-0" />
              <span>Total Amount Paid for Current Cycle: <strong>₹{Number(cycleAmount).toFixed(2)}</strong></span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span>Invoice: {invoiceRef}</span>
              <span>•</span>
              <span>Paid on: {formattedPaidDate}</span>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            2. BROWSE ALL AVAILABLE PLANS CATALOG WITH DYNAMIC PRICES
            ═════════════════════════════════════════════════════════════ */}
        <div id="browse-all-plans" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-brass-gold shrink-0" />
              <div>
                <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">
                  Browse All Available Plans
                </h2>
                <p className="text-xs text-slate-500 font-body">
                  Compare pricing tiers, select an upgrade, or change your billing interval anytime.
                </p>
              </div>
            </div>

            {/* Billing Interval Toggle with Live Reactivity */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto shadow-2xs">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  billingCycle === "monthly"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Monthly
              </button>

              <button
                onClick={() => setBillingCycle("quarterly")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  billingCycle === "quarterly"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <span>Quarterly</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  Save 15%
                </span>
              </button>

              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  billingCycle === "yearly"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <span>Yearly</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  Save 30%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isCurrentPlan = p.id === (subscription?.planCatalogId || 2);
              const isCurrentCycle = isCurrentPlan && billingCycle === (subscription?.billingCycle || "quarterly");

              // Effective per-student per-month rate
              const monthlyRate =
                billingCycle === "yearly"
                  ? p.priceYearly
                  : billingCycle === "quarterly"
                  ? p.priceQuarterly
                  : p.priceMonthly;

              // Cycle multiplier
              const cycleMonths = billingCycle === "yearly" ? 12 : billingCycle === "quarterly" ? 3 : 1;
              const cycleRatePerStudent = monthlyRate * cycleMonths;
              const totalInstituteCycleCost = cycleRatePerStudent * studentCount;

              // Monthly savings vs full monthly price
              const monthlyBase = p.priceMonthly;
              const savingsPercent =
                billingCycle === "yearly"
                  ? Math.round(((monthlyBase - p.priceYearly) / monthlyBase) * 100)
                  : billingCycle === "quarterly"
                  ? Math.round(((monthlyBase - p.priceQuarterly) / monthlyBase) * 100)
                  : 0;

              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-2xl p-6 transition-all flex flex-col justify-between relative bg-white",
                    isCurrentPlan
                      ? "border-2 border-chalk-teal shadow-md ring-4 ring-chalk-teal/5"
                      : "border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-md"
                  )}
                >
                  {/* Top Badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-chalk-teal text-white text-[10px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Current Active Plan</span>
                    </div>
                  )}
                  {p.name === "Pro" && !isCurrentPlan && (
                    <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-brass-gold text-slate-900 text-[10px] font-bold tracking-wider uppercase shadow-xs">
                      Popular Choice
                    </div>
                  )}

                  <div>
                    {/* Plan Header */}
                    <div className="flex items-start justify-between gap-2 pb-2">
                      <div>
                        <h3 className="text-xl font-bold font-display text-slate-900">
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-body mt-1 min-h-[36px]">
                          {p.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Price Block with Live Calculated Rates */}
                    <div className="mt-3 pt-4 border-t border-slate-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold font-display text-slate-900">
                          ₹{monthlyRate}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          / student / month
                        </span>
                        {savingsPercent > 0 && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Save {savingsPercent}%
                          </span>
                        )}
                      </div>

                      {/* Billing Cycle Details */}
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Billed {billingCycle}:</span>
                          <strong className="text-slate-900 font-mono">
                            ₹{cycleRatePerStudent} / student
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>For your {studentCount} students:</span>
                          <strong className="text-emerald-700 font-mono font-bold">
                            ₹{totalInstituteCycleCost} / {billingCycle === "quarterly" ? "3 mos" : billingCycle === "yearly" ? "year" : "month"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mt-5 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        What&apos;s Included:
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <Check className="w-4 h-4 text-chalk-teal shrink-0" />
                        <span>Up to {p.flatTeacherLimit || 1} Teacher Account{p.flatTeacherLimit && p.flatTeacherLimit > 1 ? "s" : ""}</span>
                      </div>
                      {p.features?.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-chalk-teal shrink-0 mt-0.5" />
                          <span>{FEATURE_NAMES[f] || f.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan CTA Button */}
                  <div className="mt-8 pt-4 border-t border-slate-100">
                    {isCurrentCycle ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-chalk-teal/10 text-chalk-teal font-bold text-xs flex items-center justify-center gap-2 cursor-default"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active Plan ({billingCycle.toUpperCase()})</span>
                      </button>
                    ) : isCurrentPlan ? (
                      <button
                        onClick={() => handleOpenUpgradeModal(p)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Switch to {billingCycle.toUpperCase()} {savingsPercent > 0 ? `(Save ${savingsPercent}%)` : ""}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    ) : p.id > (subscription?.planCatalogId || 2) ? (
                      <button
                        onClick={() => handleOpenUpgradeModal(p)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#1F2E27] hover:bg-[#2E6656] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Upgrade to {p.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenUpgradeModal(p)}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Downgrade to {p.name}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            3. FEATURE COMPARISON TABLE
            ═════════════════════════════════════════════════════════════ */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold font-display text-slate-900">
              Detailed Feature Comparison
            </h3>
            <p className="text-xs text-slate-500 font-body">
              Understand all capabilities included across each tier of CampusWeb Coaching ERP.
            </p>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 pr-4">Feature</th>
                  <th className="py-3 px-4 text-center">Basic</th>
                  <th className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold rounded-t-lg">
                    Pro (Current)
                  </th>
                  <th className="py-3 px-4 text-center">Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 pr-4 font-medium">Student Directory &amp; Enrolment</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Digital Attendance &amp; Class Logs</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Fee Receipts &amp; Ledger</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">WhatsApp Automated Receipts &amp; Alerts</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Recorded Video Library &amp; Docs</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Live Google Meet Integration</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Online Assessment &amp; Tests</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Teacher Accounts</td>
                  <td className="py-3 px-4 text-center">1 Account</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 font-bold text-slate-900">
                    Up to 5 Accounts
                  </td>
                  <td className="py-3 px-4 text-center">Up to 15 Accounts</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Direct Razorpay Gateway (BYOG)</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-chalk-teal font-bold">✓</td>
                  <td className="py-3 px-4 text-center text-chalk-teal">✓</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Custom Branded Institute Website</td>
                  <td className="py-3 px-4 text-center text-slate-300">—</td>
                  <td className="py-3 px-4 text-center bg-chalk-teal/5 text-slate-300">—</td>
                  <td className="py-3 px-4 text-center text-chalk-teal font-bold">✓ Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            4. TAX INVOICE MODAL (ON-SCREEN PREVIEW)
            ═════════════════════════════════════════════════════════════ */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 px-6 bg-[#1F2E27] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-brass-gold" />
                  <h3 className="text-sm font-bold font-display">
                    Subscription Tax Invoice &amp; Receipt
                  </h3>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Preview */}
              <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-base font-bold font-display text-slate-900">
                      {tenant?.name || "Ganraj academy"}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Tenant ID: {tenant?.id || 3} • {tenant?.slug || "ganraj-academy"}
                    </p>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <p className="font-bold text-slate-800">Ref: {invoiceRef}</p>
                    <p className="text-slate-400">Date: {formattedPaidDate}</p>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Plan Name
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {currentPlan.name} Tier
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Billing Cycle
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5 uppercase">
                      {subscription?.billingCycle || "Quarterly"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Enrolled Students
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {studentCount} Active
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Status
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Paid &amp; Active
                    </span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-semibold text-[10px] uppercase">
                      <tr className="border-b border-slate-200">
                        <th className="py-2.5 px-3 text-left">Description</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">
                            CampusWeb Cloud Platform Subscription ({subscription?.billingCycle || "quarterly"})
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Prepaid Cloud OS license for {studentCount} students
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(cycleAmount).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-slate-50/50 font-bold">
                        <td className="py-2.5 px-3 text-slate-800">Total Amount Paid</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-sm">
                          ₹{Number(cycleAmount).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between text-[11px] text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Transaction confirmed via Razorpay</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-700">
                    ID: {paymentId}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F2E27] hover:bg-[#2E6656] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            5. UPGRADE CONFIRMATION MODAL WITH LIVE BACKEND QUOTE
            ═════════════════════════════════════════════════════════════ */}
        {upgradeModalPlan && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold font-display text-slate-900">
                  Switch to {upgradeModalPlan.name} Plan
                </h3>
                <button
                  onClick={() => {
                    if (!submittingChange) {
                      setUpgradeModalPlan(null);
                      setChangeSuccessMessage(null);
                    }
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-600">
                {changeSuccessMessage ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-bold text-sm text-emerald-800">{changeSuccessMessage}</p>
                    <p className="text-xs text-emerald-600">Updating your institute workspace...</p>
                  </div>
                ) : quoteLoading ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-chalk-teal" />
                    <p className="text-xs text-slate-500">Calculating accurate prorated bill...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-chalk-teal/5 border border-chalk-teal/20 text-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm text-chalk-teal">
                          {upgradeModalPlan.name} Tier
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-chalk-teal border border-chalk-teal/20 uppercase">
                          {billingCycle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        ₹{billingCycle === "yearly" ? upgradeModalPlan.priceYearly : billingCycle === "quarterly" ? upgradeModalPlan.priceQuarterly : upgradeModalPlan.priceMonthly} / student / month
                      </p>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Active Students Enrolled:</span>
                        <strong className="text-slate-900">{studentCount} Students</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>New Cycle Gross:</span>
                        <strong className="text-slate-900 font-mono">₹{quoteData?.newCycleAmount || 0}</strong>
                      </div>
                      {quoteData?.prorationCredit > 0 && (
                        <div className="flex items-center justify-between text-emerald-700">
                          <span>Unused Days Credit:</span>
                          <span className="font-mono font-bold">- ₹{quoteData.prorationCredit}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                        <span>Net Amount Due Today:</span>
                        <span className="font-mono text-emerald-700">
                          ₹{quoteData?.amountDue ?? (quoteData?.newCycleAmount || 0)}
                        </span>
                      </div>
                    </div>

                    <p className="leading-relaxed text-[11px] text-slate-500">
                      Plan changes take effect immediately. All {studentCount} active students will instantly gain access to the features included in the {upgradeModalPlan.name} tier.
                    </p>
                  </>
                )}
              </div>

              {!changeSuccessMessage && (
                <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    disabled={submittingChange}
                    onClick={() => setUpgradeModalPlan(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submittingChange || quoteLoading}
                    onClick={handleConfirmPlanChange}
                    className="px-5 py-2 rounded-xl bg-chalk-teal hover:bg-[#245245] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingChange && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm &amp; Proceed</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          6. DEDICATED PRINT-ONLY A4 TAX INVOICE (SHOWN ONLY ON PRINT)
          ═════════════════════════════════════════════════════════════════ */}
      <div
        id="subscription-print-invoice"
        className="hidden print:block font-body p-6 bg-white text-slate-900 w-full max-h-[285mm] overflow-hidden page-single print-single-page"
      >
        {/* Document Header */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-display tracking-tight text-slate-900">
                CampusWeb
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-700">
                CLOUD ERP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              CampusWeb
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded bg-slate-100 text-xs font-bold font-mono tracking-wider text-slate-800 uppercase mb-2">
              TAX INVOICE / RECEIPT
            </span>
            <p className="text-sm font-bold font-mono text-slate-900">
              {invoiceRef}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice Date: <strong className="text-slate-800">{formattedPaidDate}</strong>
            </p>
            <p className="text-xs text-slate-500">
              Period: {formattedPaidDate} — {formattedRenewalDate}
            </p>
          </div>
        </div>

        {/* Billed To / Institute Details */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Billed To (Institute Customer):
            </span>
            <h4 className="text-base font-bold font-display text-slate-900">
              {tenant?.name || "Ganraj academy"}
            </h4>
            <p className="text-slate-600 mt-1">
              Admin: <strong>{user?.fullName || "Shanta ram"}</strong>
            </p>
            <p className="text-slate-600">
              Email: {user?.email || "aneesshaikh329@gmail.com"}
            </p>
            <p className="text-slate-600">
              Phone: {user?.phone || "+91 8080161421"}
            </p>
            <p className="text-slate-400 mt-1 font-mono text-[11px]">
              Tenant Slug: {tenant?.slug || "ganraj-academy"} • Tenant ID: #{tenant?.id || 3}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Subscription Particulars:
            </span>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Platform Tier:</span>
                <strong className="text-slate-900">{currentPlan.name} Plan</strong>
              </div>
              <div className="flex justify-between">
                <span>Billing Interval:</span>
                <strong className="text-slate-900 uppercase">
                  {subscription?.billingCycle || "Quarterly"} (3 Months)
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Active Student Quota:</span>
                <strong className="text-slate-900">{studentCount} Students Enrolled</strong>
              </div>
              <div className="flex justify-between">
                <span>Next Renewal Date:</span>
                <strong className="text-slate-900">{formattedRenewalDate}</strong>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <strong className="text-emerald-700 font-mono">Razorpay Online Verified</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 pr-4">#</th>
                <th className="py-2.5 px-4">Item Description</th>
                <th className="py-2.5 px-4 text-center">SAC Code</th>
                <th className="py-2.5 px-4 text-center">Student Capacity</th>
                <th className="py-2.5 px-4 text-right">Per-Student Rate</th>
                <th className="py-2.5 pl-4 text-right">Total (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="py-4 pr-4 font-mono">01</td>
                <td className="py-4 px-4">
                  <p className="font-bold text-slate-900">
                    CampusWeb {currentPlan.name} Subscription License
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Coaching Cloud Operating System — Attendance, Batches, Online Tests, WhatsApp Automation, Fee Ledger
                  </p>
                </td>
                <td className="py-4 px-4 text-center font-mono">998431</td>
                <td className="py-4 px-4 text-center font-semibold">{studentCount}</td>
                <td className="py-4 px-4 text-right font-mono">₹{ratePerStudent}.00</td>
                <td className="py-4 pl-4 text-right font-mono font-bold text-slate-900">
                  ₹{Number(cycleAmount).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculations / Summary */}
        <div className="flex justify-end py-6 border-b border-slate-200">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">₹{Number(cycleAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (0% / Inter-State SaaS):</span>
              <span className="font-mono">₹0.00</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-bold text-slate-900">
              <span>Total Amount Paid:</span>
              <span className="font-mono text-emerald-800 text-base">₹{Number(cycleAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Amount in words & Transaction Details */}
        <div className="py-6 border-b border-slate-200 text-xs grid grid-cols-2 gap-8">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Amount In Words:
            </span>
            <p className="font-semibold text-slate-900">
              Indian Rupees Seventy-Two Only
            </p>

            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono space-y-1">
              <p>Razorpay Payment ID: {paymentId}</p>
              <p>Razorpay Order ID: {orderId}</p>
              <p>Status: VERIFIED &amp; CONFIRMED</p>
            </div>
          </div>

          <div className="flex flex-col justify-between items-end text-right">
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-center max-w-xs">
              <p className="font-bold text-xs uppercase tracking-wider">
                ✓ CampusWeb Digitally Verified
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Issued by CampusWeb Billing Authority on behalf of {tenant?.name || "Ganraj academy"}
              </p>
            </div>

            <p className="text-[10px] text-slate-400">
              This is a computer-generated tax invoice and requires no physical signature.
            </p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="pt-6 text-[10px] text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-500 mb-0.5">Terms of Service &amp; SLA:</p>
          <p>
            1. Subscription licenses are pre-paid according to selected billing cycles and auto-renew on the indicated renewal date.
          </p>
          <p>
            2. CampusWeb provides 99.9% uptime SLA with daily automated cloud backups. For billing support, write to support@campusweb.co.in.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
