"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Users,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Search,
  X,
  Layers,
  ChevronRight,
  BookMarked,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";

interface Batch {
  id: number;
  name: string;
  grade?: string | null;
  subjectIds?: number[];
  studentCount?: number;
  subjectNames?: string[];
}

interface Subject {
  id: number;
  name: string;
  totalChapters?: number;
}

interface Teacher {
  id: number;
  fullName: string;
  phone: string;
}

interface TimetableItem {
  id: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string;
  endTime: string;
  batch: string;
  subject?: string;
  teacher: string;
  batchId: number;
  teacherId: number;
  subjectId?: number;
}

const DAYS_OF_WEEK = [
  { label: "Monday", value: 1, short: "Mon" },
  { label: "Tuesday", value: 2, short: "Tue" },
  { label: "Wednesday", value: 3, short: "Wed" },
  { label: "Thursday", value: 4, short: "Thu" },
  { label: "Friday", value: 5, short: "Fri" },
  { label: "Saturday", value: 6, short: "Sat" },
  { label: "Sunday", value: 0, short: "Sun" },
];

const GRADE_PRESETS: Option[] = [
  { label: "Class 9th", value: "Class 9th" },
  { label: "Class 10th", value: "Class 10th" },
  { label: "Class 11th - Science", value: "Class 11th - Science" },
  { label: "Class 11th - Commerce", value: "Class 11th - Commerce" },
  { label: "Class 12th - Science", value: "Class 12th - Science" },
  { label: "Class 12th - Commerce", value: "Class 12th - Commerce" },
  { label: "JEE Main & Advanced", value: "JEE" },
  { label: "NEET Medical", value: "NEET" },
  { label: "Foundation / Olympiad", value: "Foundation" },
];

function BatchesContent() {
  const searchParams = useSearchParams();

  // Active Tab: 'batches' | 'timetable'
  const [activeTab, setActiveTab] = useState<"batches" | "timetable">("batches");

  // Data states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [batchSearch, setBatchSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1); // Defaults to Monday

  // Create Batch Drawer
  const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchGrade, setNewBatchGrade] = useState<string | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

  // Create Timetable Session Drawer
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [schedBatchId, setSchedBatchId] = useState<number | null>(null);
  const [schedSubjectId, setSchedSubjectId] = useState<number | null>(null);
  const [schedTeacherId, setSchedTeacherId] = useState<number | null>(null);
  const [schedDay, setSchedDay] = useState<number>(1);
  const [schedStartTime, setSchedStartTime] = useState("09:00");
  const [schedEndTime, setSchedEndTime] = useState("10:30");

  // Auto-open drawer if ?action=new
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsBatchDrawerOpen(true);
    }
  }, [searchParams]);

  // Fetch all batch & timetable data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [batchesRes, subjectsRes, teachersRes, timetableRes] = await Promise.allSettled([
        apiClient.get("/admin/batches"),
        apiClient.get("/admin/subjects"),
        apiClient.get("/admin/teachers"),
        apiClient.get("/admin/timetable"),
      ]);

      if (batchesRes.status === "rejected") {
        throw batchesRes.reason;
      }

      const bData = batchesRes.value?.data;
      const sData = subjectsRes.status === "fulfilled" ? subjectsRes.value?.data : [];
      const tData = teachersRes.status === "fulfilled" ? teachersRes.value?.data : [];
      const ttData = timetableRes.status === "fulfilled" ? timetableRes.value?.data : [];

      const bList = Array.isArray(bData) ? bData : bData?.batches || [];
      const sList = Array.isArray(sData) ? sData : sData?.subjects || [];
      const tList = Array.isArray(tData) ? tData : tData?.teachers || [];
      const ttList = Array.isArray(ttData) ? ttData : ttData?.timetable || [];

      setBatches(bList);
      setSubjects(sList);
      setTeachers(tList);
      setTimetable(ttList);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load batch records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);

    if (!newBatchName.trim()) {
      setBatchError("Please enter a batch name.");
      return;
    }

    setBatchSubmitting(true);
    try {
      await apiClient.post("/admin/batches", {
        name: newBatchName.trim(),
        grade: newBatchGrade || undefined,
        subjectIds: selectedSubjectIds,
      });

      // Reset
      setNewBatchName("");
      setNewBatchGrade(null);
      setSelectedSubjectIds([]);
      setIsBatchDrawerOpen(false);

      fetchData();
    } catch (err: any) {
      setBatchError(err?.response?.data?.message || err?.message || "Failed to create batch.");
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Handle Schedule Class Session
  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);

    if (!schedBatchId) {
      setScheduleError("Please select a batch.");
      return;
    }
    if (!schedTeacherId) {
      setScheduleError("Please select an educator / teacher.");
      return;
    }

    setScheduleSubmitting(true);
    try {
      await apiClient.post("/admin/timetable", {
        batchId: schedBatchId,
        subjectId: schedSubjectId || undefined,
        teacherId: schedTeacherId,
        dayOfWeek: schedDay,
        startTime: schedStartTime,
        endTime: schedEndTime,
      });

      setIsScheduleDrawerOpen(false);
      fetchData();
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message || err?.message || "Failed to schedule class.");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Format Time Helper
  const formatTimeStr = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const fHour = hour % 12 || 12;
    return `${fHour}:${m} ${ampm}`;
  };

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const q = batchSearch.toLowerCase().trim();
    return (
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.grade?.toLowerCase().includes(q) ||
      b.subjectNames?.some((s) => s.toLowerCase().includes(q))
    );
  });

  // Filtered Timetable for selected day
  const dayTimetable = timetable.filter((item) => item.dayOfWeek === selectedDay);

  // Dropdown options
  const batchOptions: Option[] = batches.map((b) => ({
    label: b.name,
    value: b.id,
    description: b.grade || undefined,
  }));

  const subjectOptions: Option[] = subjects.map((s) => ({
    label: s.name,
    value: s.id,
    description: s.totalChapters ? `${s.totalChapters} chapters planned` : undefined,
  }));

  const teacherOptions: Option[] = teachers.map((t) => ({
    label: t.fullName,
    value: t.id,
    description: `+91 ${t.phone}`,
  }));

  const dayOptions: Option[] = DAYS_OF_WEEK.map((d) => ({
    label: d.label,
    value: d.value,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Top Header: Title & Actions ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-green tracking-tight">
              Batches &amp; Class Timetable
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize student batches, assign subjects, and schedule weekly teacher timetables.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Refresh Records"
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {activeTab === "batches" ? (
              <button
                onClick={() => setIsBatchDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Batch</span>
              </button>
            ) : (
              <button
                onClick={() => setIsScheduleDrawerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Class</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Segmented Dual-Tab Switcher ─── */}
        <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("batches")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "batches"
                ? "bg-white text-ink-green shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Active Batches ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("timetable")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "timetable"
                ? "bg-white text-ink-green shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Timetable ({timetable.length})</span>
          </button>
        </div>

        {/* ─── Loading / Error ─── */}
        {loading && (
          <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80">
            <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading batch &amp; schedule details...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center bg-white rounded-2xl border border-red-200">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-3 py-1.5 bg-ink-green text-white text-xs font-semibold rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {/* ════════════ TAB 1: BATCHES OVERVIEW ════════════ */}
        {!loading && !error && activeTab === "batches" && (
          <div className="space-y-4">
            {/* Search Filter */}
            <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Search batch by name, grade, or subjects..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200/80 focus:border-ink-green outline-none transition-all"
                />
              </div>

              <span className="text-xs text-slate-400 hidden sm:block">
                Showing {filteredBatches.length} of {batches.length} batches
              </span>
            </div>

            {filteredBatches.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No batches found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Create your first batch to start assigning students and classes.
                </p>
                <button
                  onClick={() => setIsBatchDrawerOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-green text-white text-xs font-semibold rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Batch</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Batch Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                            {batch.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold font-display text-slate-900 group-hover:text-ink-green transition-colors leading-snug">
                              {batch.name}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-400">
                              {batch.grade || "General Grade"}
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                          <Users className="w-3 h-3" />
                          <span>{batch.studentCount ?? 0}</span>
                        </span>
                      </div>

                      {/* Subjects Covered */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Subjects Covered
                        </p>
                        {batch.subjectNames && batch.subjectNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {batch.subjectNames.map((subj) => (
                              <span
                                key={subj}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No subjects assigned yet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Batch Footer */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        href={`/students?batch=${batch.id}`}
                        variant="secondary"
                        size="sm"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                        iconPosition="right"
                      >
                        View Students
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          setSchedBatchId(batch.id);
                          setIsScheduleDrawerOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        icon={<Plus className="w-3.5 h-3.5" />}
                      >
                        Schedule Class
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ TAB 2: WEEKLY TIMETABLE ════════════ */}
        {!loading && !error && activeTab === "timetable" && (
          <div className="space-y-4">
            {/* Day Selector Pills */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDay === day.value;
                const countForDay = timetable.filter((t) => t.dayOfWeek === day.value).length;

                return (
                  <button
                    key={day.value}
                    onClick={() => setSelectedDay(day.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "bg-ink-green text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{day.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {countForDay}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Daily Timetable Card Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-display">
                    {DAYS_OF_WEEK.find((d) => d.value === selectedDay)?.label} Schedule
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {dayTimetable.length} class sessions scheduled
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSchedDay(selectedDay);
                    setIsScheduleDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Class Session</span>
                </button>
              </div>

              {dayTimetable.length === 0 ? (
                <div className="p-16 text-center text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No classes scheduled on this day</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click &quot;Add Class Session&quot; to assign a teacher, subject and batch.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="py-3.5 px-6">Class Time</th>
                        <th className="py-3.5 px-6">Batch Name</th>
                        <th className="py-3.5 px-6">Subject</th>
                        <th className="py-3.5 px-6">Assigned Teacher</th>
                        <th className="py-3.5 px-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayTimetable.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap font-medium text-slate-800">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatTimeStr(session.startTime)} - {formatTimeStr(session.endTime)}
                            </span>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap font-semibold text-slate-900">
                            {session.batch}
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap text-slate-700">
                            {session.subject || "General / Revision"}
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-chalk-teal/15 text-chalk-teal font-bold text-[10px] flex items-center justify-center">
                                {session.teacher.slice(0, 1).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{session.teacher}</span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Scheduled
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Drawer 1: Create Batch ─── */}
      <Drawer
        isOpen={isBatchDrawerOpen}
        onClose={() => setIsBatchDrawerOpen(false)}
        title="Create New Batch"
        description="Set up a cohort for students and assign core subjects."
        width="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsBatchDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-batch-form"
              disabled={batchSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {batchSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Batch...</span>
                </>
              ) : (
                <span>Save Batch</span>
              )}
            </button>
          </>
        }
      >
        <form id="create-batch-form" onSubmit={handleCreateBatch} className="space-y-4">
          {batchError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{batchError}</span>
            </div>
          )}

          {/* Batch Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Batch Name *
            </label>
            <input
              type="text"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder="e.g. NEET 2026 - Morning Cohort"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-medium"
              required
            />
          </div>

          {/* Grade Preset */}
          <div>
            <CustomSelect
              label="Grade / Target Level"
              options={GRADE_PRESETS}
              value={newBatchGrade}
              onChange={(val) => setNewBatchGrade(val)}
              placeholder="Select target grade..."
            />
          </div>

          {/* Subjects Covered Multi-Select Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Covered Subjects
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto space-y-2">
              {subjects.length === 0 ? (
                <p className="text-xs text-slate-400">No subjects created yet in the institute.</p>
              ) : (
                subjects.map((subj) => {
                  const isChecked = selectedSubjectIds.includes(subj.id);
                  return (
                    <label
                      key={subj.id}
                      className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subj.id));
                          } else {
                            setSelectedSubjectIds([...selectedSubjectIds, subj.id]);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-ink-green focus:ring-ink-green/20"
                      />
                      <span className="font-medium">{subj.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              All students enrolled in this batch will automatically have these subjects in their syllabus.
            </p>
          </div>
        </form>
      </Drawer>

      {/* ─── Drawer 2: Schedule Class Session ─── */}
      <Drawer
        isOpen={isScheduleDrawerOpen}
        onClose={() => setIsScheduleDrawerOpen(false)}
        title="Schedule Class Session"
        description="Add a timetable slot for a batch with assigned educator."
        width="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsScheduleDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-class-form"
              disabled={scheduleSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {scheduleSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Add Timetable Slot</span>
              )}
            </button>
          </>
        }
      >
        <form id="schedule-class-form" onSubmit={handleScheduleClass} className="space-y-4">
          {scheduleError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{scheduleError}</span>
            </div>
          )}

          {/* Batch Selector */}
          <div>
            <CustomSelect
              label="Target Batch *"
              options={batchOptions}
              value={schedBatchId}
              onChange={(val) => setSchedBatchId(val)}
              placeholder="Select batch..."
              searchable
            />
          </div>

          {/* Subject Selector */}
          <div>
            <CustomSelect
              label="Subject"
              options={subjectOptions}
              value={schedSubjectId}
              onChange={(val) => setSchedSubjectId(val)}
              placeholder="Select subject (or leave general)..."
              searchable
            />
          </div>

          {/* Teacher Selector */}
          <div>
            <CustomSelect
              label="Assigned Teacher *"
              options={teacherOptions}
              value={schedTeacherId}
              onChange={(val) => setSchedTeacherId(val)}
              placeholder="Select teacher..."
              searchable
            />
          </div>

          {/* Day of Week */}
          <div>
            <CustomSelect
              label="Day of Week *"
              options={dayOptions}
              value={schedDay}
              onChange={(val) => setSchedDay(val)}
              placeholder="Select day..."
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Time *
              </label>
              <input
                type="time"
                value={schedStartTime}
                onChange={(e) => setSchedStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                End Time *
              </label>
              <input
                type="time"
                value={schedEndTime}
                onChange={(e) => setSchedEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                required
              />
            </div>
          </div>
        </form>
      </Drawer>
    </DashboardLayout>
  );
}

export default function BatchesPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading batches &amp; timetable...</p>
          </div>
        </DashboardLayout>
      }
    >
      <BatchesContent />
    </Suspense>
  );
}

