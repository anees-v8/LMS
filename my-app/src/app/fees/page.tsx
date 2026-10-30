"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  Phone,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Printer,
  ExternalLink,
  Loader2,
  X,
  IndianRupee,
  Share2,
  MessageCircle,
  FileText,
  Calendar,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import Drawer from "@/components/ui/Drawer";
import { apiClient } from "@/lib/api/client";

interface FeeRow {
  studentId: number;
  name: string;
  total: number;
  paid: number;
  pending: number;
  parentName?: string | null;
  parentPhone?: string | null;
  has_overdue?: boolean;
}

interface FeeAnalytics {
  totalCollected: number;
  totalCollectedGrowth: number;
  totalPending: number;
  pendingStudents: number;
  overdue: number;
  overdueStudents: number;
  todayCollection: number;
  todayPaymentsCount: number;
}

const PAYMENT_METHODS: Option[] = [
  { label: "Cash Payment", value: "cash", description: "Direct counter cash collection" },
  { label: "UPI / QR Code", value: "upi", description: "Google Pay, PhonePe, Paytm, BHIM" },
  { label: "Debit / Credit Card", value: "card", description: "Card swipe / POS terminal" },
];

const STATUS_FILTER_OPTIONS: Option[] = [
  { label: "All Fee Status", value: "all" },
  { label: "Paid in Full", value: "paid" },
  { label: "Pending Balance", value: "pending" },
  { label: "Critical Overdue", value: "overdue" },
];

function FeesContent() {
  const searchParams = useSearchParams();

  const [fees, setFees] = useState<FeeRow[]>([]);
  const [analytics, setAnalytics] = useState<FeeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Record Payment Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Record Payment Form Fields
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // Success Receipt Modal
  const [lastReceipt, setLastReceipt] = useState<{
    receiptNo: string;
    amountPaid: number;
    studentName: string;
  } | null>(null);

  // Reminding state per student
  const [remindingStudentId, setRemindingStudentId] = useState<number | null>(null);

  // Auto-open drawer if ?action=record or ?studentId=X
  useEffect(() => {
    if (searchParams.get("action") === "record") {
      setIsDrawerOpen(true);
    }
    const studentIdParam = searchParams.get("studentId");
    if (studentIdParam) {
      setSelectedStudentId(Number(studentIdParam));
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // Fetch Fee List & Analytics
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feesRes, analyticsRes] = await Promise.all([
        apiClient.get("/admin/fees"),
        apiClient.get("/admin/fees/analytics"),
      ]);

      const feeList = Array.isArray(feesRes.data) ? feesRes.data : feesRes.data?.fees || [];
      setFees(feeList);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load fee records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!selectedStudentId) {
      setPaymentError("Please select a student.");
      return;
    }

    const numAmount = parseInt(amountPaid, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await apiClient.post("/admin/fees/payments", {
        studentId: selectedStudentId,
        amountPaid: numAmount,
        method: paymentMethod || "cash",
      });

      const student = fees.find((f) => f.studentId === selectedStudentId);

      // Close drawer & show success receipt banner
      setIsDrawerOpen(false);
      setLastReceipt({
        receiptNo: res.data.receiptNo,
        amountPaid: numAmount,
        studentName: student?.name || "Student",
      });

      // Reset form
      setAmountPaid("");
      setSelectedStudentId(null);
      setPaymentMethod("cash");

      // Refresh list
      fetchData();
    } catch (err: any) {
      setPaymentError(
        err?.response?.data?.message || err?.message || "Failed to record payment."
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  // WhatsApp Due Reminder
  const handleSendReminder = async (student: FeeRow) => {
    try {
      setRemindingStudentId(student.studentId);
      const res = await apiClient.post(`/admin/fees/${student.studentId}/remind`);
      if (res.data?.waUrl) {
        window.open(res.data.waUrl, "_blank");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to generate WhatsApp reminder.");
    } finally {
      setRemindingStudentId(null);
    }
  };

  // Indian Rupee Formatter
  const formatInr = (amt: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Prepare Student Options for Payment Drawer
  const studentSelectOptions: Option[] = fees.map((f) => ({
    label: `${f.name}`,
    value: f.studentId,
    description: `Pending balance: ${formatInr(f.pending)} (Total: ${formatInr(f.total)})`,
  }));

  // Filtering Logic
  const filteredFees = fees.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.parentPhone?.includes(q) ||
      f.parentName?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && f.pending <= 0) ||
      (statusFilter === "pending" && f.pending > 0) ||
      (statusFilter === "overdue" && f.has_overdue && f.pending > 0);

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Header: Title & Action Button ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-green tracking-tight">
              Fees &amp; Collections
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track student fee accounts, record payments, and issue official receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Refresh Fees"
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => {
                setSelectedStudentId(null);
                setAmountPaid("");
                setIsDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>

        {/* ─── Last Recorded Payment Success Banner ─── */}
        {lastReceipt && (
          <div className="p-4 px-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Payment of {formatInr(lastReceipt.amountPaid)} recorded for {lastReceipt.studentName}!
                </p>
                <p className="text-[11px] text-emerald-700 font-mono">
                  Receipt No: #{lastReceipt.receiptNo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={`/receipt/${lastReceipt.receiptNo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </a>
              <button
                onClick={() => setLastReceipt(null)}
                className="p-1.5 text-emerald-700 hover:text-emerald-900 rounded-lg hover:bg-emerald-100/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── 4 Top Fee KPI Cards (From Analytics Endpoint) ─── */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Collected This Month */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Month Collections
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                  {formatInr(analytics.totalCollected)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                  {analytics.totalCollectedGrowth > 0 ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      +{analytics.totalCollectedGrowth}%
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">Recorded fees</span>
                  )}
                  <span className="text-slate-400">vs last month</span>
                </div>
              </div>
            </div>

            {/* Collected Today */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Collected Today
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                  {formatInr(analytics.todayCollection)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{analytics.todayPaymentsCount} payments today</span>
                </div>
              </div>
            </div>

            {/* Total Pending Dues */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Outstanding Dues
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-amber-900 tracking-tight">
                  {formatInr(analytics.totalPending)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span className="text-amber-700 font-medium">
                    {analytics.pendingStudents} students
                  </span>
                  <span>with balance</span>
                </div>
              </div>
            </div>

            {/* Critical Overdue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Critical Overdue
                </span>
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-red-600 tracking-tight">
                  {formatInr(analytics.overdue)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-[10px]">
                    {analytics.overdueStudents} Overdue
                  </span>
                  <span className="text-slate-400">Past due date</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Filters & Search Toolbar ─── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or parent phone..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200/80 focus:border-ink-green outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-56">
            <CustomSelect
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder="Filter Fee Status"
            />
          </div>
        </div>

        {/* ─── Fees Data Table ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredFees.length}</strong> of {fees.length} student accounts
            </span>
            {(searchQuery || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="text-xs text-ink-green font-semibold hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
              <p className="text-xs font-semibold text-slate-500">Loading fee records...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <button
                onClick={fetchData}
                className="mt-3 px-3 py-1.5 bg-ink-green text-white text-xs font-semibold rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No fee accounts found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try searching with a different name or status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-6">Student Account</th>
                    <th className="py-3.5 px-6">Total Fee</th>
                    <th className="py-3.5 px-6">Paid Amount</th>
                    <th className="py-3.5 px-6">Balance Due</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.map((fee) => {
                    const isPaid = fee.pending <= 0;
                    const isOverdue = fee.has_overdue && fee.pending > 0;

                    return (
                      <tr key={fee.studentId} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student Details */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div>
                            <Link
                              href={`/students/${fee.studentId}`}
                              className="font-semibold text-slate-900 hover:text-ink-green hover:underline leading-snug"
                            >
                              {fee.name}
                            </Link>
                            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {fee.parentPhone ? `+91 ${fee.parentPhone}` : "No phone registered"}
                            </p>
                          </div>
                        </td>

                        {/* Total Fee */}
                        <td className="py-4 px-6 whitespace-nowrap font-medium text-slate-800">
                          {formatInr(fee.total)}
                        </td>

                        {/* Paid */}
                        <td className="py-4 px-6 whitespace-nowrap font-semibold text-emerald-700">
                          {formatInr(fee.paid)}
                        </td>

                        {/* Pending Due */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              isPaid ? "text-slate-400" : isOverdue ? "text-red-600" : "text-amber-800"
                            }`}
                          >
                            {formatInr(fee.pending)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              PAID
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              OVERDUE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              PENDING
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Record Payment Button */}
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(fee.studentId);
                                  setAmountPaid(String(fee.pending));
                                  setIsDrawerOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Record Payment</span>
                              </button>
                            )}

                            {/* WhatsApp Reminder Button */}
                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => handleSendReminder(fee)}
                                disabled={remindingStudentId === fee.studentId}
                                title="Send WhatsApp Fee Reminder"
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {remindingStudentId === fee.studentId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                ) : (
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Slide-over Drawer: Record Payment ─── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Record Fee Payment"
        description="Enter the amount received to generate an official digital receipt."
        width="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="record-payment-form"
              disabled={submittingPayment}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {submittingPayment ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <span>Confirm &amp; Generate Receipt</span>
              )}
            </button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleRecordPayment} className="space-y-4">
          {paymentError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Student Selector */}
          <div>
            <CustomSelect
              label="Select Student *"
              options={studentSelectOptions}
              value={selectedStudentId}
              onChange={(val) => {
                setSelectedStudentId(val);
                const s = fees.find((f) => f.studentId === val);
                if (s && s.pending > 0) {
                  setAmountPaid(String(s.pending));
                }
              }}
              placeholder="Search student by name..."
              searchable
            />
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount Received (₹) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                min={1}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full pl-8 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono font-semibold"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <CustomSelect
              label="Payment Mode *"
              options={PAYMENT_METHODS}
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val)}
              placeholder="Select mode..."
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Digital Receipt Guarantee</p>
            <p className="text-[11px] leading-relaxed">
              Submitting this payment generates a unique tamper-proof receipt with QR verification that can be printed or sent via WhatsApp to the parent.
            </p>
          </div>
        </form>
      </Drawer>
    </DashboardLayout>
  );
}

export default function FeesPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading fee records...</p>
          </div>
        </DashboardLayout>
      }
    >
      <FeesContent />
    </Suspense>
  );
}

