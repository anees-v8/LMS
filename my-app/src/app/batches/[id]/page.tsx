"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  Users,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Circle,
  Search,
  BookMarked,
  Trash2,
  Check,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiClient } from "@/lib/api/client";

interface SubjectRef {
  id: number;
  name: string;
}

interface ChapterItem {
  id: number;
  name: string;
  completed?: boolean;
  completedAt?: string | null;
  chapterNumber?: number;
}

interface ScheduleSlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject?: string;
  teacher?: string;
  teacherId?: number;
  subjectId?: number;
}

interface EnrolledStudent {
  id: number;
  fullName: string;
  rollNo?: string;
  phone?: string;
  parentPhone?: string;
  email?: string;
  gender?: string;
  attendanceRate?: number;
}

interface BatchDetailData {
  id: number;
  name: string;
  grade?: string;
  feeAmount?: number;
  installmentCount?: number;
  startDate?: string;
  endDate?: string;
  studentCount?: number;
  subjects?: SubjectRef[];
  schedule?: ScheduleSlot[];
  students?: EnrolledStudent[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const batchId = resolvedParams.id;

  const [batch, setBatch] = useState<BatchDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'syllabus' | 'schedule' | 'students'
  const [activeTab, setActiveTab] = useState<"syllabus" | "schedule" | "students">("syllabus");

  // Syllabus state
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);
  const [togglingChapterId, setTogglingChapterId] = useState<number | null>(null);

  // Student filter
  const [studentSearch, setStudentSearch] = useState("");

  // Load batch data
  const loadBatch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<BatchDetailData>(`/admin/batches/${batchId}`);
      setBatch(res.data);

      // Auto select first subject
      if (res.data.subjects && res.data.subjects.length > 0) {
        setSelectedSubjectId((prev) => prev || res.data.subjects![0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load batch details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  // Load chapters when selected subject changes
  const loadChapters = useCallback(async (subjId: number) => {
    try {
      setLoadingChapters(true);
      const res = await apiClient.get<ChapterItem[]>(
        `/admin/batches/${batchId}/subjects/${subjId}/chapters`
      );
      setChapters(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load chapters", err);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (selectedSubjectId) {
      loadChapters(selectedSubjectId);
    }
  }, [selectedSubjectId, loadChapters]);

  // Toggle chapter completion
  const handleToggleComplete = async (chapter: ChapterItem) => {
    if (!selectedSubjectId || togglingChapterId !== null) return;
    const targetStatus = !chapter.completed;
    setTogglingChapterId(chapter.id);

    // Optimistic UI update
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapter.id
          ? { ...c, completed: targetStatus, completedAt: targetStatus ? new Date().toISOString() : null }
          : c
      )
    );

    try {
      await apiClient.patch(
        `/admin/batches/${batchId}/subjects/${selectedSubjectId}/chapters/${chapter.id}/complete`,
        { completed: targetStatus }
      );
    } catch (err) {
      console.error("Failed to toggle chapter completion", err);
      // Revert on error
      loadChapters(selectedSubjectId);
    } finally {
      setTogglingChapterId(null);
    }
  };

  // Add chapter
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim() || !selectedSubjectId || addingChapter) return;

    setAddingChapter(true);
    try {
      await apiClient.post(
        `/admin/batches/${batchId}/subjects/${selectedSubjectId}/chapters`,
        { name: newChapterName.trim() }
      );
      setNewChapterName("");
      await loadChapters(selectedSubjectId);
    } catch (err) {
      console.error("Failed to add chapter", err);
    } finally {
      setAddingChapter(false);
    }
  };

  // Filter students
  const filteredStudents = (batch?.students || []).filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  });

  // Calculate Syllabus Completion %
  const totalChapters = chapters.length;
  const completedChapters = chapters.filter((c) => c.completed).length;
  const completionPercentage =
    totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-ink-green" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Batch Details...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !batch) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-red-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Batch Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">{error || "The requested batch does not exist."}</p>
          <Link
            href="/batches"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Batches</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/batches"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-ink-green transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Batches</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/students?batch=${batch.id}`}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Admit Students to Batch</span>
            </Link>
          </div>
        </div>

        {/* ─── Hero Overview Card ─── */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-chalk-teal/10 text-chalk-teal border border-chalk-teal/20">
                  {batch.grade ? `Grade ${batch.grade}` : "General Batch"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● Active Session
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
                {batch.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Batch ID: #{batch.id}</span>
                {batch.startDate && <span>• Started {new Date(batch.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>}
              </p>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[90px]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Students</p>
                <p className="text-xl font-bold font-display text-slate-900 mt-0.5">
                  {batch.studentCount || 0}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[90px]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subjects</p>
                <p className="text-xl font-bold font-display text-slate-900 mt-0.5">
                  {batch.subjects?.length || 0}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[90px]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fee / Student</p>
                <p className="text-xl font-bold font-display text-ink-green mt-0.5">
                  ₹{batch.feeAmount?.toLocaleString("en-IN") || "0"}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 mt-8 -mb-6 sm:-mb-8 -mx-6 sm:-mx-8 px-6 sm:px-8 gap-6">
            <button
              onClick={() => setActiveTab("syllabus")}
              className={`pb-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "syllabus"
                  ? "border-ink-green text-ink-green font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>Syllabus & Chapters</span>
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`pb-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "schedule"
                  ? "border-ink-green text-ink-green font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Weekly Timetable ({batch.schedule?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`pb-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "students"
                  ? "border-ink-green text-ink-green font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Enrolled Students ({batch.students?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* ════════════════ TAB 1: SYLLABUS & CHAPTERS ════════════════ */}
        {activeTab === "syllabus" && (
          <div className="space-y-6">
            {/* Subject Selector Pills */}
            {batch.subjects && batch.subjects.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Subjects:
                </span>
                {batch.subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubjectId(s.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedSubjectId === s.id
                        ? "bg-ink-green text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                No subjects assigned to this batch yet. Assign subjects to track chapters.
              </div>
            )}

            {selectedSubjectId && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                {/* Progress Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold font-display text-slate-900">
                      Chapter Completion Tracker
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Check off chapters as teachers finish lectures in class.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-2xl font-bold font-display text-slate-900">
                        {completionPercentage}%
                      </span>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {completedChapters} of {totalChapters} Chapters Done
                      </p>
                    </div>

                    <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Add Chapter Form */}
                <form onSubmit={handleAddChapter} className="flex gap-2.5">
                  <input
                    type="text"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder="Enter chapter title (e.g. Chapter 4: Thermodynamics)"
                    disabled={addingChapter}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink-green/20 focus:border-ink-green transition-all"
                  />
                  <button
                    type="submit"
                    disabled={addingChapter || !newChapterName.trim()}
                    className="px-4 py-2.5 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {addingChapter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Add Chapter</span>
                  </button>
                </form>

                {/* Chapters List */}
                {loadingChapters ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-ink-green mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading syllabus...</p>
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No chapters added yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add your first chapter above to start syllabus tracking for this subject.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {chapters.map((ch, idx) => (
                      <div
                        key={ch.id}
                        onClick={() => handleToggleComplete(ch)}
                        className={`p-3.5 px-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer group ${
                          ch.completed
                            ? "bg-emerald-50/60 border-emerald-200 text-slate-900"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              ch.completed
                                ? "bg-emerald-500 text-white shadow-xs"
                                : "border-2 border-slate-300 group-hover:border-ink-green text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div>
                            <p
                              className={`text-xs font-medium ${
                                ch.completed ? "line-through text-slate-500 font-normal" : "text-slate-900 font-semibold"
                              }`}
                            >
                              {ch.name}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Chapter {ch.chapterNumber || idx + 1}
                              {ch.completedAt && (
                                <> • Completed on {new Date(ch.completedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</>
                              )}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            ch.completed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ch.completed ? "Done" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB 2: WEEKLY SCHEDULE ════════════════ */}
        {activeTab === "schedule" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900">
                  Weekly Class Timetable
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled lecture slots and faculty allocations for {batch.name}.
                </p>
              </div>

              <Link
                href="/batches"
                className="text-xs font-semibold text-ink-green hover:underline inline-flex items-center gap-1"
              >
                <span>Edit schedule slots</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!batch.schedule || batch.schedule.length === 0) ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No schedule slots configured</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assign weekly class timings and faculty to this batch from the Batches page.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {batch.schedule.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-chalk-teal/10 text-chalk-teal">
                        {DAY_NAMES[slot.dayOfWeek]}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {slot.startTime?.slice(0, 5)} - {slot.endTime?.slice(0, 5)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        {slot.subject || "Subject"}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <GraduationCap className="w-3.5 h-3.5 text-brass-gold" />
                        <span>Teacher: {slot.teacher || "Unassigned"}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB 3: ENROLLED STUDENTS ════════════════ */}
        {activeTab === "students" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900">
                  Enrolled Students ({batch.students?.length || 0})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Active admissions registered in {batch.name}.
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student or roll no..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink-green/20 focus:border-ink-green transition-all"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No students match your search</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Admit new students from the Students page to enroll them in this batch.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-3 px-3">Roll No</th>
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Attendance</th>
                      <th className="py-3 px-3 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-600">
                          {st.rollNo || `#${st.id}`}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {st.fullName}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {st.phone || st.parentPhone || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (st.attendanceRate ?? 100) >= 75
                                    ? "bg-emerald-500"
                                    : (st.attendanceRate ?? 100) >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${st.attendanceRate ?? 100}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">
                              {st.attendanceRate ?? 100}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/students/${st.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-green hover:underline"
                          >
                            <span>View Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
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

