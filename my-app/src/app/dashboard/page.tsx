"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  IndianRupee,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  Plus,
  CreditCard,
  BarChart3,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ChevronRight,
  LineChart as LineChartIcon,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomMonthPicker from "@/components/ui/CustomMonthPicker";
import Button from "@/components/ui/Button";

interface DashboardData {
  overview: {
    totalStudents: number;
    studentsGrowth: number;
    totalTeachers: number;
    teachersGrowth: number | null;
    feesCollected: number;
    feesCollectedGrowth: number;
    feesPending: number;
    feesPendingGrowth: number;
  };
  studentChart?: Array<{ day: string; count: number }>;
  feesChart?: { collected: number; pending: number };
  upcomingSchedule: Array<{
    id: number;
    startTime: string;
    endTime: string;
    batchName: string;
    subjectName?: string | null;
    teacherName: string;
  }>;
  subscription?: {
    planName: string;
    status: string;
    trialEndsAt: string | null;
    nextBillingDate: string | null;
  } | null;
}

export default function DashboardPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart interactivity states
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/dashboard", {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setData(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format currency in Indian format
  const formatInr = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format time (e.g., 09:00:00 -> 09:00 AM)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "N/A";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  // Subscription days calculation
  const getSubscriptionDetails = () => {
    if (!data?.subscription) return null;
    const sub = data.subscription;
    const isTrial = sub.status === "trial";
    const targetDateStr = isTrial ? sub.trialEndsAt : sub.nextBillingDate;
    if (!targetDateStr) return { planName: sub.planName, daysLeft: null, isTrial };

    const targetDate = new Date(targetDateStr);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      planName: sub.planName || "Pro Plan",
      daysLeft: Math.max(0, daysLeft),
      isTrial,
      targetDate: targetDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  };

  const subInfo = getSubscriptionDetails();

  // Percentage calculations
  const totalFees =
    (data?.overview?.feesCollected || 0) + (data?.overview?.feesPending || 0);
  const collectedPercentage =
    totalFees > 0
      ? Math.round(((data?.overview?.feesCollected || 0) / totalFees) * 100)
      : 100;

  // Student trend chart data normalized
  const chartPoints = useMemo(() => {
    if (!data?.studentChart || data.studentChart.length === 0) {
      const baseCount = data?.overview?.totalStudents || 2;
      return [
        { day: "Mon", count: Math.max(1, baseCount - 1) },
        { day: "Tue", count: Math.max(1, baseCount - 1) },
        { day: "Wed", count: baseCount },
        { day: "Thu", count: baseCount },
        { day: "Fri", count: baseCount },
        { day: "Sat", count: baseCount },
        { day: "Sun", count: baseCount },
      ];
    }
    return data.studentChart;
  }, [data?.studentChart, data?.overview?.totalStudents]);

  // Donut chart math
  const donutRadius = 46;
  const donutStroke = 12;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~289.02
  const collectedRatio = totalFees > 0 ? (data?.overview?.feesCollected || 0) / totalFees : 1;
  const collectedDashOffset = donutCircumference * (1 - collectedRatio);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Top Filter Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-ink-green tracking-tight">
              Dashboard Overview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Key operational metrics, live trends, and today&apos;s active batch schedule.
            </p>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2">
            <CustomMonthPicker
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
            />

            <button
              onClick={fetchDashboardData}
              title="Refresh Data"
              disabled={loading}
              className="p-2 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ─── Subscription Notice (if present) ─── */}
        {subInfo && subInfo.daysLeft !== null && subInfo.daysLeft <= 14 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {subInfo.planName} • {subInfo.isTrial ? "Trial Period" : "Active Subscription"}
                </p>
                <p className="text-xs text-amber-700">
                  {subInfo.daysLeft === 0
                    ? "Your subscription expires today."
                    : `${subInfo.daysLeft} days remaining (Renews on ${subInfo.targetDate}).`}
                </p>
              </div>
            </div>
            <Link
              href="/settings?tab=subscription"
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-colors shrink-0"
            >
              Manage Plan
            </Link>
          </div>
        )}

        {/* ─── Loading / Error States ─── */}
        {loading && !data && (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80">
            <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
            <p className="text-xs font-semibold text-slate-500">Fetching institute metrics...</p>
          </div>
        )}

        {error && !data && (
          <div className="p-8 text-center bg-white rounded-2xl border border-red-200">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">Could not load dashboard</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-ink-green text-white text-xs font-semibold rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ─── 4 Top KPI Stat Cards ─── */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Students */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Students
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                  {data.overview.totalStudents ?? 0}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                  {data.overview.studentsGrowth > 0 ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      +{data.overview.studentsGrowth}%
                    </span>
                  ) : data.overview.studentsGrowth < 0 ? (
                    <span className="text-red-600 font-semibold inline-flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" />
                      {data.overview.studentsGrowth}%
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">0% change</span>
                  )}
                  <span className="text-slate-400">vs last month</span>
                </div>
              </div>
            </div>

            {/* Total Teachers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Teachers
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                  {data.overview.totalTeachers ?? 0}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Active Teachers</span>
                </div>
              </div>
            </div>

            {/* Fees Collected */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fees Collected
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-slate-900 tracking-tight">
                  {formatInr(data.overview.feesCollected)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                  {data.overview.feesCollectedGrowth > 0 ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      +{data.overview.feesCollectedGrowth}%
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">Recorded payments</span>
                  )}
                  <span className="text-slate-400">received</span>
                </div>
              </div>
            </div>

            {/* Fees Pending */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Dues
                </span>
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-red-600 tracking-tight">
                  {formatInr(data.overview.feesPending)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span className="text-red-500 font-medium">Outstanding fees</span>
                  <span>to collect</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── LINEAR HORIZONTAL QUICK ACTIONS ROW (Directly below KPI Cards) ─── */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/students?action=new"
              className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-chalk-teal hover:bg-chalk-teal/[0.03] transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-chalk-teal truncate">
                  New Student
                </p>
                <p className="text-[11px] text-slate-500 truncate">Add admission</p>
              </div>
            </Link>

            <Link
              href="/fees?action=record"
              className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-600 hover:bg-amber-500/[0.03] transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate">
                  Collect Fee
                </p>
                <p className="text-[11px] text-slate-500 truncate">Issue receipt</p>
              </div>
            </Link>

            <Link
              href="/batches?action=new"
              className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-600 hover:bg-blue-500/[0.03] transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                  New Batch
                </p>
                <p className="text-[11px] text-slate-500 truncate">Create schedule</p>
              </div>
            </Link>

            <Link
              href="/reports"
              className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-600 hover:bg-purple-500/[0.03] transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 truncate">
                  Reports
                </p>
                <p className="text-[11px] text-slate-500 truncate">View analytics</p>
              </div>
            </Link>
          </div>
        )}

        {/* ─── VISUAL ANALYTICS & CHARTS SECTION ─── */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 1. Student Admissions & Growth Trend Chart (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-chalk-teal/10 text-chalk-teal flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">
                        Student Strength &amp; Admissions Trend
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      7-day active enrollment curve and daily admission velocity.
                    </p>
                  </div>

                  {/* Chart View Toggle */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-600 self-start sm:self-center">
                    <button
                      onClick={() => setChartType("area")}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        chartType === "area"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <LineChartIcon className="w-3 h-3" />
                      <span>Curve</span>
                    </button>
                    <button
                      onClick={() => setChartType("bar")}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        chartType === "bar"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Bars</span>
                    </button>
                  </div>
                </div>

                {/* SVG Visual Chart */}
                <div className="relative pt-2 pb-1">
                  {/* Tooltip Popup on Hover */}
                  {hoveredPoint !== null && chartPoints[hoveredPoint] && (
                    <div
                      className="absolute top-0 z-10 -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[11px] shadow-lg pointer-events-none transition-all duration-100 flex items-center gap-1.5"
                      style={{
                        left: `${
                          40 +
                          (hoveredPoint / (chartPoints.length - 1 || 1)) * (100 - 15)
                        }%`,
                      }}
                    >
                      <span className="font-semibold text-teal-300">
                        {chartPoints[hoveredPoint].day}:
                      </span>
                      <span>{chartPoints[hoveredPoint].count} Students</span>
                    </div>
                  )}

                  <div className="w-full h-44">
                    {(() => {
                      const svgWidth = 500;
                      const svgHeight = 160;
                      const padLeft = 32;
                      const padRight = 16;
                      const padTop = 15;
                      const padBottom = 25;
                      const graphW = svgWidth - padLeft - padRight;
                      const graphH = svgHeight - padTop - padBottom;

                      const counts = chartPoints.map((p) => p.count);
                      const maxVal = Math.max(4, ...counts);
                      const minVal = 0;

                      // Calculate point coords
                      const coords = chartPoints.map((p, i) => {
                        const x = padLeft + (i / (chartPoints.length - 1 || 1)) * graphW;
                        const y =
                          padTop +
                          graphH -
                          ((p.count - minVal) / (maxVal - minVal || 1)) * graphH;
                        return { x, y, ...p };
                      });

                      // Cubic Bezier spline
                      let linePath = `M ${coords[0].x} ${coords[0].y}`;
                      for (let i = 1; i < coords.length; i++) {
                        const prev = coords[i - 1];
                        const curr = coords[i];
                        const cpx1 = prev.x + (curr.x - prev.x) / 2;
                        const cpy1 = prev.y;
                        const cpx2 = prev.x + (curr.x - prev.x) / 2;
                        const cpy2 = curr.y;
                        linePath += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
                      }

                      const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${
                        padTop + graphH
                      } L ${coords[0].x} ${padTop + graphH} Z`;

                      const gridSteps = [0, 0.5, 1];

                      return (
                        <svg
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          className="w-full h-full overflow-visible"
                        >
                          <defs>
                            <linearGradient
                              id="studentAreaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="0%" stopColor="#2E6656" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#2E6656" stopOpacity="0.00" />
                            </linearGradient>

                            <linearGradient
                              id="studentBarGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="0%" stopColor="#2E6656" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="#1F2E27" stopOpacity="0.95" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Dashed Gridlines */}
                          {gridSteps.map((step, idx) => {
                            const y = padTop + graphH * (1 - step);
                            const valLabel = Math.round(minVal + (maxVal - minVal) * step);
                            return (
                              <g key={idx}>
                                <line
                                  x1={padLeft}
                                  y1={y}
                                  x2={svgWidth - padRight}
                                  y2={y}
                                  stroke="#E2E8F0"
                                  strokeDasharray="3 3"
                                  strokeWidth="1"
                                />
                                <text
                                  x={padLeft - 8}
                                  y={y + 3}
                                  textAnchor="end"
                                  className="fill-slate-400 text-[9px] font-mono select-none"
                                >
                                  {valLabel}
                                </text>
                              </g>
                            );
                          })}

                          {chartType === "area" ? (
                            <>
                              {/* Filled Area */}
                              <path d={areaPath} fill="url(#studentAreaGradient)" />

                              {/* Curve Stroke Line */}
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#2E6656"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />

                              {/* Interactive Nodes */}
                              {coords.map((c, i) => (
                                <g
                                  key={i}
                                  onMouseEnter={() => setHoveredPoint(i)}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                  className="cursor-pointer"
                                >
                                  <circle
                                    cx={c.x}
                                    cy={c.y}
                                    r={hoveredPoint === i ? 6 : 4}
                                    className={`transition-all duration-150 ${
                                      hoveredPoint === i
                                        ? "fill-[#1F2E27] stroke-white stroke-2"
                                        : "fill-white stroke-[#2E6656] stroke-2"
                                    }`}
                                  />
                                </g>
                              ))}
                            </>
                          ) : (
                            /* Bar Chart View */
                            coords.map((c, i) => {
                              const barW = 28;
                              const barH = Math.max(4, padTop + graphH - c.y);
                              const barX = c.x - barW / 2;
                              const barY = c.y;
                              const isHovered = hoveredPoint === i;
                              return (
                                <g
                                  key={i}
                                  onMouseEnter={() => setHoveredPoint(i)}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                  className="cursor-pointer"
                                >
                                  <rect
                                    x={barX}
                                    y={barY}
                                    width={barW}
                                    height={barH}
                                    rx="6"
                                    fill={isHovered ? "#1F2E27" : "url(#studentBarGradient)"}
                                    className="transition-colors duration-150"
                                  />
                                  <text
                                    x={c.x}
                                    y={barY - 4}
                                    textAnchor="middle"
                                    className={`text-[10px] font-mono font-bold select-none ${
                                      isHovered ? "fill-slate-900" : "fill-slate-500"
                                    }`}
                                  >
                                    {c.count}
                                  </text>
                                </g>
                              );
                            })
                          )}

                          {/* X-axis Day Labels */}
                          {coords.map((c, i) => (
                            <text
                              key={i}
                              x={c.x}
                              y={svgHeight - 4}
                              textAnchor="middle"
                              className={`text-[10px] font-semibold select-none ${
                                hoveredPoint === i
                                  ? "fill-slate-900 font-bold"
                                  : "fill-slate-400"
                              }`}
                            >
                              {c.day}
                            </text>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Bottom Quick KPI Pills */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-chalk-teal" />
                    Enrolled: <strong className="font-semibold text-slate-900">{data.overview.totalStudents}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">
                    Active Rate: <strong className="font-semibold text-emerald-700">100%</strong>
                  </span>
                </div>
                <Button
                  href="/students"
                  variant="secondary"
                  size="xs"
                  icon={<ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  iconPosition="right"
                >
                  Directory
                </Button>
              </div>
            </div>

            {/* 2. Fee Collection vs Pending Recovery Donut Chart (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">
                      Fee Recovery &amp; Cashflow
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Collection ratio vs outstanding balance.
                    </p>
                  </div>
                  <Button
                    href="/fees"
                    variant="secondary"
                    size="xs"
                    icon={<ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                    iconPosition="right"
                  >
                    Ledger
                  </Button>
                </div>

                {/* Donut & Stats Row */}
                <div className="flex items-center gap-5 pt-1">
                  {/* SVG Donut Ring */}
                  <div className="relative w-32 h-32 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      {/* Background circle (Pending portion) */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        stroke="#FEF3C7"
                        strokeWidth={donutStroke}
                        fill="none"
                      />
                      {/* Foreground circle (Collected portion) */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        stroke="#10B981"
                        strokeWidth={donutStroke}
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={collectedDashOffset}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    {/* Centered Percentage */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xl font-bold font-display text-slate-900 leading-none">
                        {collectedPercentage}%
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                        Recovery
                      </span>
                    </div>
                  </div>

                  {/* Breakdown Cards */}
                  <div className="flex-1 space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Collected</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-950 mt-0.5">
                          {formatInr(data.overview.feesCollected)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200/50">
                        {collectedPercentage}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Pending</span>
                        </div>
                        <p className="text-sm font-bold text-amber-950 mt-0.5">
                          {formatInr(data.overview.feesPending)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-700 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200/50">
                        {100 - collectedPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Valuation bar */}
                <div className="mt-3.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-body">
                  <span>Total Course Fee Invoiced:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatInr(totalFees)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Auto receipts enabled
                </span>
                <Button
                  href="/fees?action=record"
                  variant="primary"
                  size="xs"
                  icon={<Plus className="w-3 h-3" />}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TODAY'S CLASS SCHEDULE TABLE (Full 12 cols wide) ─── */}
        {data && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-ink-green text-white flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-display">
                    Today&apos;s Class Schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live batches and teacher timetable for today.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden md:inline text-[11px] text-slate-400">
                  Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">Ctrl + K</kbd> to search students
                </span>
                <Button
                  href="/batches?tab=timetable"
                  variant="secondary"
                  size="sm"
                  icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
                >
                  Full Timetable
                </Button>
              </div>
            </div>

            {data.upcomingSchedule.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No classes scheduled for today.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enjoy your off day or assign a new timetable in the Batches module.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-5">Batch</th>
                      <th className="py-3 px-5">Subject</th>
                      <th className="py-3 px-5">Teacher</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.upcomingSchedule.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-slate-800 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                          {item.batchName}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 whitespace-nowrap">
                          {item.subjectName || "General"}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-chalk-teal/15 text-chalk-teal font-bold text-[10px] flex items-center justify-center">
                              {item.teacherName.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{item.teacherName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <Button
                            href="/batches"
                            variant="secondary"
                            size="xs"
                            icon={<ChevronRight className="w-3 h-3 text-slate-400" />}
                            iconPosition="right"
                          >
                            View Batch
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
