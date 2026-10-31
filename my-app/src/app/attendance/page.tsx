"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Filter,
  Save,
  Check,
  ShieldCheck,
  Calendar as CalendarIcon,
  Phone,
  Copy,
  ExternalLink,
  BookOpen,
  UserCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";

interface BatchOption {
  id: number;
  name: string;
  grade?: string;
}

interface BatchAttendanceSummary {
  batchId: number;
  batchName: string;
  grade: string | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  isMarked: boolean;
  markedByTeacher: string | null;
  attendanceRate: number;
}

interface AbsenteeItem {
  studentId: number;
  fullName: string;
  rollNo: string | null;
  batchId: number;
  batchName: string;
  parentPhone: string | null;
  phone: string | null;
  waUrl: string;
}

interface DefaulterStudent {
  studentId: number;
  fullName: string;
  rollNo: string | null;
  batchName: string;
  parentPhone: string | null;
  attendanceRate: number;
  totalClasses: number;
  attendedClasses: number;
}

interface OverallSummary {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  overallAttendanceRate: number;
  batchesMarkedCount: number;
  batchesTotalCount: number;
}

interface StudentRegisterRecord {
  studentId: number;
  fullName: string;
  rollNo: string | null;
  phone: string | null;
  parentPhone: string | null;
  status: "present" | "absent" | "late" | null;
  markedByName: string | null;
}

export default function AttendancePage() {
  const { tenant } = useAuthStore();
  const instituteName = tenant?.name || "CampusWeb Academy";

  // Date Filter (defaults to today's date in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  // Active Tab: 'overview' | 'absentees' | 'defaulters' | 'register'
  const [activeTab, setActiveTab] = useState<"overview" | "absentees" | "defaulters" | "register">("overview");

  // Institute-wide data
  const [loading, setLoading] = useState(true);
  const [overallSummary, setOverallSummary] = useState<OverallSummary | null>(null);
  const [batchSummaries, setBatchSummaries] = useState<BatchAttendanceSummary[]>([]);
  const [absentees, setAbsentees] = useState<AbsenteeItem[]>([]);
  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);

  // Absentee Tab Filters
  const [absenteeBatchFilter, setAbsenteeBatchFilter] = useState<string>("all");
  const [absenteeSearch, setAbsenteeSearch] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  // Register Tab State (Specific Batch Inspection & Admin Override)
  const [batchesList, setBatchesList] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerRecords, setRegisterRecords] = useState<StudentRegisterRecord[]>([]);
  const [localStatuses, setLocalStatuses] = useState<Record<number, "present" | "absent" | "late">>({});
  const [savingRegister, setSavingRegister] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [registerSearch, setRegisterSearch] = useState("");

  // 1. Fetch Institute-wide Attendance Overview
  const fetchInstituteAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{
        date: string;
        overallSummary: OverallSummary;
        batchSummaries: BatchAttendanceSummary[];
        absentees: AbsenteeItem[];
        defaulters: DefaulterStudent[];
      }>(`/admin/attendance?date=${selectedDate}`);

      setOverallSummary(res.data.overallSummary);
      setBatchSummaries(res.data.batchSummaries || []);
      setAbsentees(res.data.absentees || []);
      setDefaulters(res.data.defaulters || []);
    } catch (err) {
      console.error("Failed to fetch institute attendance", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // 2. Fetch Batches for Dropdowns
  useEffect(() => {
    apiClient
      .get<BatchOption[]>("/admin/batches")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.batches || [];
        setBatchesList(list);
        if (list.length > 0 && !selectedBatchId) {
          setSelectedBatchId(list[0].id);
        }
      })
      .catch((err) => console.error("Failed to load batches", err));
  }, []);

  useEffect(() => {
    fetchInstituteAttendance();
  }, [fetchInstituteAttendance]);

  // 3. Fetch Specific Batch Register when Register Tab is active
  const fetchBatchRegister = useCallback(async () => {
    if (!selectedBatchId) return;
    setRegisterLoading(true);
    try {
      const res = await apiClient.get<{
        batchId: number;
        batchName: string;
        date: string;
        records: StudentRegisterRecord[];
      }>(`/admin/attendance?batchId=${selectedBatchId}&date=${selectedDate}`);

      const recs = res.data.records || [];
      setRegisterRecords(recs);

      // Pre-fill local status map
      const map: Record<number, "present" | "absent" | "late"> = {};
      recs.forEach((r) => {
        if (r.status) {
          map[r.studentId] = r.status;
        }
      });
      setLocalStatuses(map);
    } catch (err) {
      console.error("Failed to load batch register", err);
    } finally {
      setRegisterLoading(false);
    }
  }, [selectedBatchId, selectedDate]);

  useEffect(() => {
    if (activeTab === "register" && selectedBatchId) {
      fetchBatchRegister();
    }
  }, [activeTab, selectedBatchId, selectedDate, fetchBatchRegister]);

  // Save Admin Override Punch
  const handleSaveRegister = async () => {
    if (!selectedBatchId || savingRegister) return;
    setSavingRegister(true);
    setSaveSuccess(false);
    try {
      const payloadRecords = Object.entries(localStatuses).map(([studentId, status]) => ({
        studentId: Number(studentId),
        status,
      }));

      await apiClient.post("/admin/attendance", {
        batchId: selectedBatchId,
        date: selectedDate,
        records: payloadRecords,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Refresh institute-wide data too
      fetchInstituteAttendance();
    } catch (err) {
      console.error("Failed to save attendance changes", err);
      alert("Failed to save attendance register. Please try again.");
    } finally {
      setSavingRegister(false);
    }
  };

  const handleSetAllStatus = (status: "present" | "absent") => {
    const map: Record<number, "present" | "absent" | "late"> = { ...localStatuses };
    registerRecords.forEach((r) => {
      map[r.studentId] = status;
    });
    setLocalStatuses(map);
  };

  // Filtered Absentees
  const filteredAbsentees = useMemo(() => {
    return absentees.filter((item) => {
      const matchesBatch =
        absenteeBatchFilter === "all" || item.batchId.toString() === absenteeBatchFilter;
      const matchesSearch =
        absenteeSearch === "" ||
        item.fullName.toLowerCase().includes(absenteeSearch.toLowerCase()) ||
        (item.rollNo && item.rollNo.toLowerCase().includes(absenteeSearch.toLowerCase()));
      return matchesBatch && matchesSearch;
    });
  }, [absentees, absenteeBatchFilter, absenteeSearch]);

  // Copy All Parent Contact Numbers for Bulk Communication
  const handleCopyAllParentPhones = () => {
    const phones = filteredAbsentees
      .map((a) => a.parentPhone || a.phone)
      .filter(Boolean) as string[];
    if (phones.length === 0) return;
    navigator.clipboard.writeText(phones.join(", "));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Filtered Register Records
  const filteredRegister = useMemo(() => {
    return registerRecords.filter((rec) => {
      if (!registerSearch) return true;
      const q = registerSearch.toLowerCase();
      return (
        rec.fullName.toLowerCase().includes(q) ||
        (rec.rollNo && rec.rollNo.toLowerCase().includes(q)) ||
        (rec.phone && rec.phone.includes(q))
      );
    });
  }, [registerRecords, registerSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* TOP HEADER */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F2E27]/10 flex items-center justify-center text-[#1F2E27] shrink-0">
              <CalendarCheck className="w-6 h-6 text-[#1F2E27]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold font-display text-neutral-900 tracking-tight">
                  Attendance & Absentee Monitoring
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Admin Desk
                </span>
              </div>
              <p className="text-xs md:text-sm text-neutral-500 mt-0.5">
                Institute-wide daily attendance tracking, teacher punch status, WhatsApp parent alerts & defaulters desk.
              </p>
            </div>
          </div>

          {/* Controls: Date Picker & Refresh */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="flex items-center gap-2 bg-[#F4F6F3] px-3 py-2 rounded-xl border border-neutral-200">
              <CalendarIcon className="w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs md:text-sm font-medium text-neutral-800 outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => {
                fetchInstituteAttendance();
                if (activeTab === "register") fetchBatchRegister();
              }}
              className="p-2.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors shadow-2xs"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Attendance Rate */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Attendance Rate
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-display text-neutral-900">
                {loading ? "..." : `${overallSummary?.overallAttendanceRate || 0}%`}
              </span>
              <span className="text-xs text-neutral-400">of enrolled</span>
            </div>
            <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#2E6656] h-full rounded-full transition-all duration-500"
                style={{ width: `${overallSummary?.overallAttendanceRate || 0}%` }}
              />
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Present Today
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-display text-[#2E6656]">
                {loading ? "..." : overallSummary?.present || 0}
              </span>
              <span className="text-xs text-neutral-400">
                / {overallSummary?.totalStudents || 0} total
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              Students punched in across batches
            </p>
          </div>

          {/* Card 3: Absentees (Alert Card) */}
          <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-xs relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Absentees Today
              </span>
              <span className="p-1.5 rounded-lg bg-red-50 text-[#A93327]">
                <XCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-display text-[#A93327]">
                {loading ? "..." : overallSummary?.absent || 0}
              </span>
              <span className="text-xs text-[#A93327] font-medium">unattended</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-[#A87D26]" />
              Requires WhatsApp parent notice
            </p>
          </div>

          {/* Card 4: Batches Marked vs Total */}
          <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Batches Punched
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-[#A87D26]">
                <BookOpen className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-display text-neutral-900">
                {loading
                  ? "..."
                  : `${overallSummary?.batchesMarkedCount || 0} / ${overallSummary?.batchesTotalCount || 0}`}
              </span>
              <span className="text-xs text-neutral-400">batches</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              {overallSummary && overallSummary.batchesTotalCount > overallSummary.batchesMarkedCount
                ? `${overallSummary.batchesTotalCount - overallSummary.batchesMarkedCount} batch pending attendance punch`
                : "All batches recorded for today"}
            </p>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="border-b border-neutral-200 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative whitespace-nowrap ${
              activeTab === "overview"
                ? "text-[#1F2E27] border-b-2 border-[#1F2E27]"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Today&apos;s Batch Status ({batchSummaries.length})
          </button>

          <button
            onClick={() => setActiveTab("absentees")}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "absentees"
                ? "text-[#1F2E27] border-b-2 border-[#1F2E27]"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Institute Absentees & WhatsApp
            {absentees.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-[#A93327] font-bold">
                {absentees.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("defaulters")}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "defaulters"
                ? "text-[#1F2E27] border-b-2 border-[#1F2E27]"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Defaulters (&lt;75%)
            {defaulters.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-[#A87D26] font-bold">
                {defaulters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "register"
                ? "text-[#1F2E27] border-b-2 border-[#1F2E27]"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Batch Register & Admin Override
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: TODAY'S BATCH STATUS                                   */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 font-display">
                  Class Batch Progress for {selectedDate}
                </h3>
                <p className="text-xs text-neutral-500">
                  Monitor which teacher has taken attendance for each batch today.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#2E6656] mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Loading batch attendance status...</p>
              </div>
            ) : batchSummaries.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <BookOpen className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-700">No active batches found</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Create batches under the Batches tab to begin tracking attendance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchSummaries.map((b) => (
                  <div
                    key={b.batchId}
                    className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs hover:border-[#2E6656]/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Batch Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-base font-bold text-neutral-900 font-display">
                            {b.batchName}
                          </h4>
                          <span className="text-xs text-neutral-500 font-medium">
                            {b.grade || "Regular Batch"} • {b.totalStudents} enrolled
                          </span>
                        </div>

                        {b.isMarked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Punched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-[#A87D26] border border-amber-200 shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Punch
                          </span>
                        )}
                      </div>

                      {/* Teacher Status */}
                      <div className="text-xs bg-[#F4F6F3] p-2.5 rounded-xl border border-neutral-200/60 mb-4 text-neutral-600">
                        {b.isMarked ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-[#2E6656]" />
                            <span>
                              Marked by:{" "}
                              <strong className="text-neutral-900 font-semibold">
                                {b.markedByTeacher || "Assigned Teacher"}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#A87D26]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Teacher has not submitted attendance yet</span>
                          </div>
                        )}
                      </div>

                      {/* Headcount Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-center py-2 bg-neutral-50/70 rounded-xl border border-neutral-100">
                        <div>
                          <div className="text-xs text-neutral-500">Present</div>
                          <div className="text-base font-bold text-[#2E6656]">{b.presentCount}</div>
                        </div>
                        <div className="border-x border-neutral-200">
                          <div className="text-xs text-neutral-500">Absent</div>
                          <div className="text-base font-bold text-[#A93327]">{b.absentCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500">Late</div>
                          <div className="text-base font-bold text-[#A87D26]">{b.lateCount}</div>
                        </div>
                      </div>

                      {/* Attendance Percentage Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-500 font-medium">Batch Turnout</span>
                          <span className="font-bold text-neutral-900">{b.attendanceRate}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              b.attendanceRate >= 75
                                ? "bg-[#2E6656]"
                                : b.attendanceRate >= 50
                                ? "bg-[#A87D26]"
                                : "bg-[#A93327]"
                            }`}
                            style={{ width: `${b.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <button
                      onClick={() => {
                        setSelectedBatchId(b.batchId);
                        setActiveTab("register");
                      }}
                      className="mt-5 w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-neutral-200 hover:bg-[#1F2E27] hover:text-white hover:border-[#1F2E27] text-xs font-semibold text-neutral-700 transition-colors"
                    >
                      <span>View & Edit Register</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: INSTITUTE ABSENTEES & WHATSAPP NOTICES                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "absentees" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search absent student by name or roll..."
                    value={absenteeSearch}
                    onChange={(e) => setAbsenteeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F4F6F3] rounded-xl text-xs md:text-sm text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 outline-none focus:border-[#2E6656]"
                  />
                </div>

                {/* Filter by Batch */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-neutral-500" />
                  <select
                    value={absenteeBatchFilter}
                    onChange={(e) => setAbsenteeBatchFilter(e.target.value)}
                    className="bg-[#F4F6F3] border border-neutral-200 text-xs md:text-sm rounded-xl px-3 py-2 text-neutral-800 outline-none cursor-pointer"
                  >
                    <option value="all">All Batches</option>
                    {batchesList.map((b) => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action: Copy All Parent Contacts */}
              <button
                onClick={handleCopyAllParentPhones}
                disabled={filteredAbsentees.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors disabled:opacity-50 shrink-0"
                title="Copy all parent numbers separated by commas for bulk SMS/WhatsApp"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedAll ? "Copied Numbers!" : "Copy Parent Numbers"}
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#2E6656] mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Loading absentees...</p>
              </div>
            ) : filteredAbsentees.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-neutral-800 font-display">
                  No Absentees Found
                </h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  {absentees.length === 0
                    ? `Either all students are present today (${selectedDate}) or batches have not yet submitted attendance.`
                    : "No absentees matched your search filter."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {filteredAbsentees.length} Student{filteredAbsentees.length > 1 ? "s" : ""} Marked Absent
                  </span>
                  <span className="text-xs text-neutral-400">
                    Click Send WhatsApp to notify parent directly with customized alert template.
                  </span>
                </div>

                <div className="divide-y divide-neutral-100">
                  {filteredAbsentees.map((item) => (
                    <div
                      key={`${item.batchId}-${item.studentId}`}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-[#A93327] flex items-center justify-center font-bold text-sm shrink-0 border border-red-100">
                          {item.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-neutral-900 font-display">
                              {item.fullName}
                            </h5>
                            {item.rollNo && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-mono">
                                {item.rollNo}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                            <span>Batch: <strong className="text-neutral-700">{item.batchName}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-neutral-400" />
                              Parent: {item.parentPhone || item.phone || "No phone listed"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Button */}
                      <div>
                        {item.waUrl ? (
                          <a
                            href={item.waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                            <span>Notify on WhatsApp</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">
                            Parent phone missing
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: CHRONIC DEFAULTERS (<75%)                              */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "defaulters" && (
          <div className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#A87D26] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Defaulter Students Monitoring Desk
                </h4>
                <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                  Students with attendance below 75% across minimum 5 held classes. These students are at high academic risk and require administrative follow-up or parent counseling.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#2E6656] mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Analyzing defaulter trends...</p>
              </div>
            ) : defaulters.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-neutral-800 font-display">
                  Zero Chronic Defaulters
                </h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  Every enrolled student in your institute currently maintains an attendance rate above 75%. Great job!
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px] font-semibold">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Batch</th>
                        <th className="py-3 px-4 text-center">Classes Attended</th>
                        <th className="py-3 px-4">Attendance Rate</th>
                        <th className="py-3 px-4">Parent Phone</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {defaulters.map((d) => (
                        <tr key={d.studentId} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-neutral-900">
                            <div>{d.fullName}</div>
                            {d.rollNo && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                Roll: {d.rollNo}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600">{d.batchName}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-neutral-800">
                              {d.attendedClasses}
                            </span>
                            <span className="text-neutral-400"> / {d.totalClasses}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
                                  d.attendanceRate < 50 ? "text-[#A93327]" : "text-[#A87D26]"
                                }`}
                              >
                                {d.attendanceRate}%
                              </span>
                              <div className="w-20 bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    d.attendanceRate < 50 ? "bg-[#A93327]" : "bg-[#A87D26]"
                                  }`}
                                  style={{ width: `${d.attendanceRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600">
                            {d.parentPhone || "Not provided"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {d.parentPhone ? (
                              <a
                                href={`https://wa.me/91${d.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Dear Parent, this is an academic alert from ${instituteName}. Your ward ${d.fullName} currently has an attendance of ${d.attendanceRate}%, which is below the mandatory 75% requirement. Please get in touch with the admin office.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-[#A87D26] border border-amber-200 transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp Parent
                              </a>
                            ) : (
                              <span className="text-xs text-neutral-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: MASTER REGISTER & ADMIN OVERRIDE                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "register" && (
          <div className="space-y-4">
            {/* Batch Selector Bar */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Select Batch Register
                  </label>
                  <select
                    value={selectedBatchId || ""}
                    onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                    className="bg-[#F4F6F3] border border-neutral-200 text-xs md:text-sm rounded-xl px-3 py-2 text-neutral-900 font-medium outline-none cursor-pointer min-w-[200px]"
                  >
                    {batchesList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.grade ? `(${b.grade})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Search Student
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Name or roll..."
                      value={registerSearch}
                      onChange={(e) => setRegisterSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 bg-[#F4F6F3] rounded-xl text-xs text-neutral-900 border border-neutral-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Save Button */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => handleSetAllStatus("present")}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  Mark All Present
                </button>

                <button
                  type="button"
                  onClick={handleSaveRegister}
                  disabled={savingRegister || registerRecords.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-[#1F2E27] hover:bg-[#15201B] text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingRegister ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saveSuccess ? "Changes Saved!" : "Save Overrides"}</span>
                </button>
              </div>
            </div>

            {/* Register Table */}
            {registerLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <RefreshCw className="w-6 h-6 animate-spin text-[#2E6656] mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Loading batch register for {selectedDate}...</p>
              </div>
            ) : registerRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
                <Users className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <h4 className="text-base font-bold text-neutral-800 font-display">
                  No Students Enrolled in this Batch
                </h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Enroll students in this batch under the Students or Batches section.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px] font-semibold">
                        <th className="py-3 px-4">Roll</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Parent Phone</th>
                        <th className="py-3 px-4">Marked By</th>
                        <th className="py-3 px-4 text-center">Admin Punch (Status)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredRegister.map((student) => {
                        const currentStatus = localStatuses[student.studentId];
                        return (
                          <tr key={student.studentId} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono text-neutral-500 text-xs">
                              {student.rollNo || "—"}
                            </td>
                            <td className="py-3 px-4 font-bold text-neutral-900">
                              {student.fullName}
                            </td>
                            <td className="py-3 px-4 text-neutral-500">
                              {student.parentPhone || student.phone || "—"}
                            </td>
                            <td className="py-3 px-4 text-neutral-500 text-xs">
                              {student.markedByName ? (
                                <span className="text-neutral-700 font-medium">
                                  {student.markedByName}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic">Unmarked</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLocalStatuses((prev) => ({
                                      ...prev,
                                      [student.studentId]: "present",
                                    }))
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "present"
                                      ? "bg-[#2E6656] text-white shadow-xs"
                                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                  }`}
                                >
                                  Present
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setLocalStatuses((prev) => ({
                                      ...prev,
                                      [student.studentId]: "absent",
                                    }))
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "absent"
                                      ? "bg-[#A93327] text-white shadow-xs"
                                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                  }`}
                                >
                                  Absent
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setLocalStatuses((prev) => ({
                                      ...prev,
                                      [student.studentId]: "late",
                                    }))
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === "late"
                                      ? "bg-[#A87D26] text-white shadow-xs"
                                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                  }`}
                                >
                                  Late
                                </button>
                              </div>
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
        )}
      </div>
    </DashboardLayout>
  );
}
