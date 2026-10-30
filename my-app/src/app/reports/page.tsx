"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/utils/cn";

interface Batch {
  id: number;
  name: string;
  grade?: string | null;
}

interface StudentPerformance {
  id: number;
  fullName: string;
  grade?: string | null;
  rollNo?: string | null;
  batchName: string;
  avgAttendance: number | null;
  avgMarksPct: number | null;
}

interface PerformanceReport {
  avgAttendance: number | null;
  avgMarksPct: number | null;
  totalTests: number;
  totalClasses: number;
  topPerformers: StudentPerformance[];
  needingAttention: StudentPerformance[];
}

function ReportsContent() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "top" | "attention">("overview");

  // Fetch batches for filter
  useEffect(() => {
    apiClient
      .get<Batch[]>("/admin/batches")
      .then((res) => setBatches(res.data || []))
      .catch((err) => console.error("Failed to load batches for filter", err));
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {};
      if (selectedBatchId !== "all") {
        params.batchId = selectedBatchId;
      }

      const res = await apiClient.get<PerformanceReport>("/admin/reports/performance", {
        params,
      });

      setReport(res.data);
    } catch (err: any) {
      console.error("Failed to fetch performance report", err);
      // In case the plan requires upgrade or no tests exist
      if (err?.response?.status === 403) {
        setError("Performance Reports is a premium feature. Please upgrade your subscription plan to view analytics.");
      } else {
        setError(err?.response?.data?.error?.message || err?.message || "Failed to load performance report");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const batchOptions: Option[] = useMemo(() => {
    return [
      { label: "All Batches Combined", value: "all" },
      ...batches.map((b) => ({
        label: `${b.name} (${b.grade || "General"})`,
        value: String(b.id),
      })),
    ];
  }, [batches]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Academic & Performance Reports</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brass-gold/10 text-brass-gold border border-brass-gold/20">
                Live Analytics
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-body mt-1">
              Detailed tracking of student test results, attendance reliability, and intervention alerts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-chalk-teal")} />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Batch Scope:
            </span>
            <div className="w-64">
              <CustomSelect
                options={batchOptions}
                value={selectedBatchId}
                onChange={setSelectedBatchId}
                placeholder="Select Batch"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "overview"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("top")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "top"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Top Performers ({report?.topPerformers.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("attention")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "attention"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>Needs Attention ({report?.needingAttention.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Content States */}
        {loading ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center">
            <Loader2 className="w-8 h-8 text-chalk-teal animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-600 font-medium">Computing academic reports & statistics...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-white border border-amber-200 text-center max-w-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Analytics Notice</h3>
            <p className="text-xs text-slate-600 mt-1">{error}</p>
            <button
              onClick={fetchReport}
              className="mt-4 px-4 py-2 rounded-xl bg-ink-green text-white text-xs font-semibold"
            >
              Retry Loading
            </button>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Avg Attendance */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Institute Attendance</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-slate-900">
                  {report.avgAttendance !== null ? `${report.avgAttendance}%` : "No data"}
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, report.avgAttendance || 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Present rate across scheduled sessions</p>
              </div>

              {/* Avg Test Score */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Avg Test Score</span>
                  <Award className="w-4 h-4 text-brass-gold" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-slate-900">
                  {report.avgMarksPct !== null ? `${report.avgMarksPct}%` : "Pending tests"}
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-brass-gold h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, report.avgMarksPct || 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Average marks across graded assessments</p>
              </div>

              {/* Total Assessments */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Total Tests Created</span>
                  <FileText className="w-4 h-4 text-chalk-teal" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-slate-900">
                  {report.totalTests}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Conducted across selected batches</p>
              </div>

              {/* Total Classes Held */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Classes Held</span>
                  <Calendar className="w-4 h-4 text-sky-600" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-slate-900">
                  {report.totalClasses}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Attendance tracking days</p>
              </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers Preview */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold font-display text-slate-900">
                        Top Rankers (Honor Roll)
                      </h3>
                    </div>
                    <Button
                      onClick={() => setActiveTab("top")}
                      variant="secondary"
                      size="xs"
                      icon={<ChevronRight className="w-3 h-3 text-slate-400" />}
                      iconPosition="right"
                    >
                      View All
                    </Button>
                  </div>

                  {report.topPerformers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No test submissions recorded yet to determine rankers.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {report.topPerformers.slice(0, 5).map((st, i) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100/60"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                i === 0
                                  ? "bg-amber-100 text-amber-800"
                                  : i === 1
                                  ? "bg-slate-200 text-slate-700"
                                  : i === 2
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-500"
                              )}
                            >
                              #{i + 1}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {st.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {st.rollNo ? `Roll: ${st.rollNo} • ` : ""}
                                {st.batchName}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-700">
                              {st.avgMarksPct !== null ? `${st.avgMarksPct}%` : "—"}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {st.avgAttendance !== null ? `${st.avgAttendance}% Att.` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attention Required Preview */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold font-display text-slate-900">
                        Attention Required (At-Risk)
                      </h3>
                    </div>
                    <Button
                      onClick={() => setActiveTab("attention")}
                      variant="secondary"
                      size="xs"
                      icon={<ChevronRight className="w-3 h-3 text-slate-400" />}
                      iconPosition="right"
                    >
                      View All
                    </Button>
                  </div>

                  {report.needingAttention.length === 0 ? (
                    <div className="py-8 text-center text-xs text-emerald-600">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                      <span>Great news! All active students meet standard attendance & test thresholds.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {report.needingAttention.slice(0, 5).map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-red-50/40 transition-colors border border-red-100/60"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {st.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {st.rollNo ? `Roll: ${st.rollNo} • ` : ""}
                              {st.batchName}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-bold text-red-600">
                                {st.avgAttendance !== null ? `${st.avgAttendance}% Att.` : "Low Att."}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {st.avgMarksPct !== null ? `${st.avgMarksPct}% Marks` : "No tests"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TOP PERFORMERS */}
            {activeTab === "top" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Ranked by Test Performance & Reliability
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Showing {report.topPerformers.length} top candidates
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-body">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Batch & Grade</th>
                        <th className="py-3 px-4">Average Marks</th>
                        <th className="py-3 px-4">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.topPerformers.map((st, i) => (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold",
                                i === 0
                                  ? "bg-amber-100 text-amber-800"
                                  : i === 1
                                  ? "bg-slate-200 text-slate-700"
                                  : i === 2
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              )}
                            >
                              #{i + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{st.fullName}</div>
                            <div className="text-[11px] text-slate-400">
                              {st.rollNo ? `Roll: ${st.rollNo}` : `ID #${st.id}`}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{st.batchName}</div>
                            <div className="text-[11px] text-slate-400">{st.grade || "—"}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-emerald-700 text-xs">
                              {st.avgMarksPct !== null ? `${st.avgMarksPct}%` : "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-700">
                              {st.avgAttendance !== null ? `${st.avgAttendance}%` : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: ATTENTION REQUIRED */}
            {activeTab === "attention" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-red-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-900">
                      Students Falling Below 75% Attendance or 60% Marks
                    </h3>
                  </div>
                  <span className="text-xs text-red-700 font-semibold">
                    {report.needingAttention.length} students at risk
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-body">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Batch</th>
                        <th className="py-3 px-4">Attendance Issue</th>
                        <th className="py-3 px-4">Marks Issue</th>
                        <th className="py-3 px-4 text-right">Intervention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.needingAttention.map((st) => {
                        const lowAtt = st.avgAttendance !== null && st.avgAttendance < 75;
                        const lowMarks = st.avgMarksPct !== null && st.avgMarksPct < 60;

                        return (
                          <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{st.fullName}</div>
                              <div className="text-[11px] text-slate-400">
                                {st.rollNo ? `Roll: ${st.rollNo}` : `ID #${st.id}`}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{st.batchName}</td>
                            <td className="py-3 px-4">
                              {lowAtt ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  {st.avgAttendance}% (Low)
                                </span>
                              ) : (
                                <span className="text-slate-600 font-medium">
                                  {st.avgAttendance !== null ? `${st.avgAttendance}%` : "—"}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {lowMarks ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  {st.avgMarksPct}% (Needs Help)
                                </span>
                              ) : (
                                <span className="text-slate-600 font-medium">
                                  {st.avgMarksPct !== null ? `${st.avgMarksPct}%` : "—"}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href={`/students`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors"
                              >
                                <span>View Profile</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-chalk-teal mb-2" />
            Loading Academic Reports...
          </div>
        </DashboardLayout>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

