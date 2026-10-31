"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  X,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/utils/cn";

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

  // Active Tab
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

  // Register Tab State
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
  }, [selectedBatchId]);

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

  // Batch options for CustomSelect
  const batchFilterOptions: Option[] = useMemo(() => {
    return [
      { label: "All Batches", value: "all" },
      ...batchesList.map((b) => ({
        label: `${b.name}${b.grade ? ` (${b.grade})` : ""}`,
        value: b.id.toString(),
      })),
    ];
  }, [batchesList]);

  const batchRegisterOptions: Option[] = useMemo(() => {
    return batchesList.map((b) => ({
      label: `${b.name}${b.grade ? ` (${b.grade})` : ""}`,
      value: b.id,
    }));
  }, [batchesList]);

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
      <div className="space-y-6 pb-12">
        {/* ─── Header: Matching Students & Teachers ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-green tracking-tight">
                Attendance & Absentee Monitoring
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-chalk-teal border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Admin Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Institute-wide daily attendance tracking, teacher punch status, WhatsApp parent alerts & defaulters desk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/90 shadow-2xs">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-medium text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                fetchInstituteAttendance();
                if (activeTab === "register") fetchBatchRegister();
              }}
              title="Refresh Data"
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ─── 4 Summary Metric Cards (Matching Dashboard & Fees) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Attendance Rate */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Turnout Rate
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-chalk-teal">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
                {loading ? "..." : `${overallSummary?.overallAttendanceRate || 0}%`}
              </span>
              <span className="text-xs text-slate-400">overall</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-chalk-teal h-full rounded-full transition-all duration-500"
                style={{ width: `${overallSummary?.overallAttendanceRate || 0}%` }}
              />
            </div>
          </div>

          {/* Card 2: Present Today */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Present Today
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-chalk-teal">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-chalk-teal">
                {loading ? "..." : overallSummary?.present || 0}
              </span>
              <span className="text-xs text-slate-400">
                / {overallSummary?.totalStudents || 0} total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Students punched across all batches
            </p>
          </div>

          {/* Card 3: Absentees */}
          <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Absentees Today
              </span>
              <span className="p-1.5 rounded-lg bg-red-50 text-red-ink">
                <XCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-red-ink">
                {loading ? "..." : overallSummary?.absent || 0}
              </span>
              <span className="text-xs text-red-ink font-medium">unattended</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-brass-gold" />
              Requires WhatsApp notice
            </p>
          </div>

          {/* Card 4: Batches Punched */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Batches Punched
              </span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-brass-gold">
                <BookOpen className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
                {loading
                  ? "..."
                  : `${overallSummary?.batchesMarkedCount || 0} / ${overallSummary?.batchesTotalCount || 0}`}
              </span>
              <span className="text-xs text-slate-400">batches</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {overallSummary && overallSummary.batchesTotalCount > overallSummary.batchesMarkedCount
                ? `${overallSummary.batchesTotalCount - overallSummary.batchesMarkedCount} pending punch`
                : "All batches recorded for today"}
            </p>
          </div>
        </div>

        {/* ─── Tab Navigation Bar (Underlined Matching UI Spec) ─── */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "pb-3 px-3 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap cursor-pointer",
              activeTab === "overview"
                ? "text-ink-green border-b-2 border-ink-green"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Today&apos;s Batch Status ({batchSummaries.length})
          </button>

          <button
            onClick={() => setActiveTab("absentees")}
            className={cn(
              "pb-3 px-3 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              activeTab === "absentees"
                ? "text-ink-green border-b-2 border-ink-green"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Institute Absentees & WhatsApp
            {absentees.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-ink font-bold">
                {absentees.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("defaulters")}
            className={cn(
              "pb-3 px-3 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              activeTab === "defaulters"
                ? "text-ink-green border-b-2 border-ink-green"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Defaulters (&lt;75%)
            {defaulters.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-brass-gold font-bold">
                {defaulters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={cn(
              "pb-3 px-3 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              activeTab === "register"
                ? "text-ink-green border-b-2 border-ink-green"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Batch Register & Override
          </button>
        </div>

        {/* ─── TAB 1: TODAY'S BATCH STATUS ─── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Class Batch Progress for {selectedDate}
                </h3>
                <p className="text-xs text-slate-500">
                  Monitor which teacher has taken attendance for each batch today.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <RefreshCw className="w-6 h-6 animate-spin text-chalk-teal mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading batch attendance status...</p>
              </div>
            ) : batchSummaries.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800 font-display">
                  No active batches found
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Create batches under the Batches tab to begin tracking daily attendance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchSummaries.map((b) => (
                  <div
                    key={b.batchId}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-chalk-teal/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 font-display">
                            {b.batchName}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {b.grade || "Regular Batch"} • {b.totalStudents} enrolled
                          </span>
                        </div>

                        {b.isMarked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-chalk-teal border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Punched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-brass-gold border border-amber-200 shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Punch
                          </span>
                        )}
                      </div>

                      <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 mb-4 text-slate-600">
                        {b.isMarked ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-chalk-teal" />
                            <span>
                              Marked by:{" "}
                              <strong className="text-slate-900 font-semibold">
                                {b.markedByTeacher || "Assigned Teacher"}
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-brass-gold font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Teacher has not submitted attendance yet</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50/70 rounded-xl border border-slate-100">
                        <div>
                          <div className="text-[11px] text-slate-500">Present</div>
                          <div className="text-base font-bold text-chalk-teal">{b.presentCount}</div>
                        </div>
                        <div className="border-x border-slate-200">
                          <div className="text-[11px] text-slate-500">Absent</div>
                          <div className="text-base font-bold text-red-ink">{b.absentCount}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Late</div>
                          <div className="text-base font-bold text-brass-gold">{b.lateCount}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Batch Turnout</span>
                          <span className="font-bold text-slate-900">{b.attendanceRate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              b.attendanceRate >= 75
                                ? "bg-chalk-teal"
                                : b.attendanceRate >= 50
                                ? "bg-brass-gold"
                                : "bg-red-ink"
                            )}
                            style={{ width: `${b.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-5 w-full justify-center"
                      onClick={() => {
                        setSelectedBatchId(b.batchId);
                        setActiveTab("register");
                      }}
                    >
                      <span>View & Edit Register</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: INSTITUTE ABSENTEES & WHATSAPP NOTICES ─── */}
        {activeTab === "absentees" && (
          <div className="space-y-4">
            {/* Filter Bar with Reusable CustomSelect */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search absent student by name or roll number..."
                  value={absenteeSearch}
                  onChange={(e) => setAbsenteeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200/80 focus:border-ink-green outline-none transition-all"
                />
                {absenteeSearch && (
                  <button
                    onClick={() => setAbsenteeSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-full md:w-56">
                <CustomSelect
                  options={batchFilterOptions}
                  value={absenteeBatchFilter}
                  onChange={(val) => setAbsenteeBatchFilter(val)}
                  placeholder="Filter by Batch"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyAllParentPhones}
                disabled={filteredAbsentees.length === 0}
                icon={copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedAll ? "Copied Numbers!" : "Copy Parent Numbers"}
              </Button>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <RefreshCw className="w-6 h-6 animate-spin text-chalk-teal mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading absentees...</p>
              </div>
            ) : filteredAbsentees.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800 font-display">
                  No Absentees Found
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {absentees.length === 0
                    ? `Either all students are present today (${selectedDate}) or batches have not yet submitted attendance.`
                    : "No absentees matched your search filter."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing <strong className="text-slate-800">{filteredAbsentees.length}</strong> absent students
                  </span>
                  <span className="text-slate-400">
                    Click Notify on WhatsApp to send instant absence alert to parent.
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredAbsentees.map((item) => (
                    <div
                      key={`${item.batchId}-${item.studentId}`}
                      className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-ink flex items-center justify-center font-bold text-sm shrink-0 border border-red-100">
                          {item.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-slate-900 font-display">
                              {item.fullName}
                            </h5>
                            {item.rollNo && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                                {item.rollNo}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Batch: <strong className="text-slate-700">{item.batchName}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              Parent: {item.parentPhone || item.phone || "No phone listed"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {item.waUrl ? (
                          <Button
                            variant="teal"
                            size="sm"
                            href={item.waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            icon={<MessageSquare className="w-3.5 h-3.5 fill-current" />}
                          >
                            <span>Notify on WhatsApp</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
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

        {/* ─── TAB 3: CHRONIC DEFAULTERS (<75%) ─── */}
        {activeTab === "defaulters" && (
          <div className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-brass-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Defaulter Students Monitoring Desk
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Students with attendance below 75% across minimum 5 held classes. These students are at high academic risk and require administrative follow-up or parent counseling.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <RefreshCw className="w-6 h-6 animate-spin text-chalk-teal mx-auto mb-2" />
                <p className="text-xs text-slate-500">Analyzing defaulter trends...</p>
              </div>
            ) : defaulters.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800 font-display">
                  Zero Chronic Defaulters
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Every enrolled student in your institute currently maintains an attendance rate above 75%.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-4">Batch</th>
                        <th className="py-3.5 px-4 text-center">Classes Attended</th>
                        <th className="py-3.5 px-4">Attendance Rate</th>
                        <th className="py-3.5 px-4">Parent Phone</th>
                        <th className="py-3.5 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {defaulters.map((d) => (
                        <tr key={d.studentId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-900">
                            <div>{d.fullName}</div>
                            {d.rollNo && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Roll: {d.rollNo}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{d.batchName}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-800">
                              {d.attendedClasses}
                            </span>
                            <span className="text-slate-400"> / {d.totalClasses}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-bold",
                                  d.attendanceRate < 50 ? "text-red-ink" : "text-brass-gold"
                                )}
                              >
                                {d.attendanceRate}%
                              </span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    d.attendanceRate < 50 ? "bg-red-ink" : "bg-brass-gold"
                                  )}
                                  style={{ width: `${d.attendanceRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {d.parentPhone || "Not provided"}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            {d.parentPhone ? (
                              <Button
                                variant="outline"
                                size="xs"
                                href={`https://wa.me/91${d.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Dear Parent, this is an academic alert from ${instituteName}. Your ward ${d.fullName} currently has an attendance of ${d.attendanceRate}%, which is below the mandatory 75% requirement. Please get in touch with the admin office.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                icon={<MessageSquare className="w-3.5 h-3.5 text-brass-gold" />}
                              >
                                WhatsApp
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
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

        {/* ─── TAB 4: MASTER REGISTER & ADMIN OVERRIDE ─── */}
        {activeTab === "register" && (
          <div className="space-y-4">
            {/* Filter Bar with Reusable CustomSelect */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
                <div className="w-full md:w-64">
                  <CustomSelect
                    options={batchRegisterOptions}
                    value={selectedBatchId}
                    onChange={(val) => setSelectedBatchId(Number(val))}
                    placeholder="Select Batch Register"
                  />
                </div>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search student by name or roll..."
                    value={registerSearch}
                    onChange={(e) => setRegisterSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200/80 focus:border-ink-green outline-none transition-all"
                  />
                  {registerSearch && (
                    <button
                      onClick={() => setRegisterSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSetAllStatus("present")}
                >
                  Mark All Present
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRegister}
                  disabled={savingRegister || registerRecords.length === 0}
                  loading={savingRegister}
                  icon={saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                >
                  {saveSuccess ? "Changes Saved!" : "Save Overrides"}
                </Button>
              </div>
            </div>

            {/* Register Table */}
            {registerLoading ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <RefreshCw className="w-6 h-6 animate-spin text-chalk-teal mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading batch register for {selectedDate}...</p>
              </div>
            ) : registerRecords.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800 font-display">
                  No Students Enrolled in this Batch
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Enroll students in this batch under the Students or Batches section.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-6">Roll</th>
                        <th className="py-3.5 px-4">Student Name</th>
                        <th className="py-3.5 px-4">Parent Phone</th>
                        <th className="py-3.5 px-4">Marked By</th>
                        <th className="py-3.5 px-6 text-center">Status Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRegister.map((student) => {
                        const currentStatus = localStatuses[student.studentId];
                        return (
                          <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-slate-500 text-xs">
                              {student.rollNo || "—"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {student.fullName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {student.parentPhone || student.phone || "—"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-xs">
                              {student.markedByName ? (
                                <span className="text-slate-700 font-medium">
                                  {student.markedByName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Unmarked</span>
                              )}
                            </td>
                            <td className="py-3.5 px-6">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLocalStatuses((prev) => ({
                                      ...prev,
                                      [student.studentId]: "present",
                                    }))
                                  }
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    currentStatus === "present"
                                      ? "bg-chalk-teal text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
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
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    currentStatus === "absent"
                                      ? "bg-red-ink text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
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
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    currentStatus === "late"
                                      ? "bg-brass-gold text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
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
