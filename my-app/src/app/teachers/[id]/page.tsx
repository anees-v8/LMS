"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Loader2,
  ChevronRight,
  UserCheck,
  UserX,
  BookOpen,
  Users,
  ShieldCheck,
  Sun,
  Palmtree,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CustomSelect from "@/components/ui/CustomSelect";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/utils/cn";

interface Teacher {
  id: number;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  status?: "active" | "on_leave" | "inactive";
  leaveStart?: string | null;
  leaveEnd?: string | null;
  createdAt?: string;
  assignedBatches?: string[];
  assignedSubjects?: string[];
}

interface TimetableSlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  batch: string;
  subject: string;
  teacher: string;
  batchId: number;
  teacherId: number;
  subjectId: number;
}

interface BatchItem {
  id: number;
  name: string;
  grade?: string;
  studentCount?: number;
  subjects?: { id: number; name: string }[];
}

interface TeacherAssignment {
  id: number;
  teacherUserId: number;
  teacherName: string;
  batchId: number;
  batchName: string;
  subjectId: number;
  subjectName: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TeacherDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  // Assign Teacher to Batch+Subject drawer (mirrors the mobile app's
  // assign_teacher_bottom_sheet.dart: batch dropdown, subject dropdown
  // filtered to that batch's own subjects)
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState<number | null>(null);
  const [assignSubjectId, setAssignSubjectId] = useState<number | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  // Remove-assignment confirmation
  const [removingAssignment, setRemovingAssignment] = useState<TeacherAssignment | null>(null);
  const [isRemovingAssignment, setIsRemovingAssignment] = useState(false);

  // Edit Drawer
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Status & Leave Drawer
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusVal, setStatusVal] = useState<"active" | "on_leave" | "inactive">("active");
  const [leaveStart, setLeaveStart] = useState<string>("");
  const [leaveEnd, setLeaveEnd] = useState<string>("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch teacher, timetable and batches
  const fetchData = useCallback(async () => {
    if (!teacherId || isNaN(teacherId)) {
      setError("Invalid Teacher ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [teachersRes, timetableRes, batchesRes, assignmentsRes] = await Promise.all([
        apiClient.get<Teacher[]>("/admin/teachers"),
        apiClient.get<TimetableSlot[]>("/admin/schedule"),
        apiClient.get<BatchItem[]>("/admin/batches").catch(() => ({ data: [] })),
        apiClient.get<TeacherAssignment[]>(`/admin/teacher-assignments?teacherId=${teacherId}`).catch(() => ({ data: [] })),
      ]);

      const found = teachersRes.data.find((t) => t.id === teacherId);
      if (!found) {
        setError("Teacher not found in your institute directory.");
        setLoading(false);
        return;
      }

      setTeacher(found);
      setBatches(batchesRes.data || []);
      setAssignments(assignmentsRes.data || []);

      // Filter timetable slots for this teacher
      const slots = (timetableRes.data || []).filter(
        (s) =>
          s.teacherId === teacherId ||
          (s.teacher && s.teacher.toLowerCase() === found.fullName.toLowerCase())
      );
      setTimetable(slots);

      // Pre-fill edit inputs
      setEditFullName(found.fullName || "");
      setEditPhone(found.phone || "");
      setEditEmail(found.email || "");

      // Pre-fill status inputs
      setStatusVal(found.status || "active");
      setLeaveStart(found.leaveStart ? found.leaveStart.split("T")[0] : "");
      setLeaveEnd(found.leaveEnd ? found.leaveEnd.split("T")[0] : "");
    } catch (err: any) {
      console.error("Error loading teacher details:", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load teacher information."
      );
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Distinct batches and subjects, derived from the teacher's actual
  // assignments (not the schedule) — a teacher can be assigned to a
  // batch+subject before any class slot has been scheduled for it yet.
  const assignedBatchesList = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.batchId));
    return Array.from(ids);
  }, [assignments]);

  const assignedSubjectsList = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.subjectName) set.add(a.subjectName);
    });
    return Array.from(set);
  }, [assignments]);

  // Subjects available for the Assign drawer's subject dropdown, filtered
  // to the selected batch's own covered subjects (mirrors the mobile app's
  // assign_teacher_bottom_sheet.dart client-side filter — no extra API call).
  const assignSubjectOptions = useMemo(() => {
    const batch = batches.find((b) => b.id === assignBatchId);
    return (batch?.subjects || []).map((s) => ({ label: s.name, value: s.id }));
  }, [batches, assignBatchId]);

  // Timetable grouped by day of week
  const groupedSchedule = useMemo(() => {
    const groups: { dayIndex: number; dayName: string; slots: TimetableSlot[] }[] = [];
    // Days 1 (Mon) to 6 (Sat) then 0 (Sun)
    const order = [1, 2, 3, 4, 5, 6, 0];
    order.forEach((dayIdx) => {
      const daySlots = timetable
        .filter((s) => s.dayOfWeek === dayIdx)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (daySlots.length > 0) {
        groups.push({
          dayIndex: dayIdx,
          dayName: DAYS[dayIdx],
          slots: daySlots,
        });
      }
    });
    return groups;
  }, [timetable]);

  // Save Edit Profile
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const cleanPhone = editPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setEditError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!editFullName.trim()) {
      setEditError("Full name is required.");
      return;
    }

    if (!editEmail.trim()) {
      setEditError("Email is required — used to verify password resets and changes.");
      return;
    }

    const cleanEmail = editEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setEditError("Please enter a valid email address.");
      return;
    }

    try {
      setIsSavingEdit(true);
      await apiClient.put(`/admin/teachers/${teacherId}`, {
        fullName: editFullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
      });

      setIsEditOpen(false);
      await fetchData();
    } catch (err: any) {
      setEditError(
        err?.response?.data?.error?.message ||
          "Failed to update teacher profile."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Save Status & Leave
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);

    if (statusVal === "on_leave" && !leaveStart) {
      setStatusError("Please specify a leave start date.");
      return;
    }

    try {
      setIsSavingStatus(true);
      await apiClient.put(`/admin/teachers/${teacherId}`, {
        status: statusVal,
        leaveStart: statusVal === "on_leave" ? leaveStart : null,
        leaveEnd: statusVal === "on_leave" && leaveEnd ? leaveEnd : null,
      });

      setIsStatusOpen(false);
      await fetchData();
    } catch (err: any) {
      setStatusError(
        err?.response?.data?.error?.message ||
          "Failed to update teacher status."
      );
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Assign Teacher to a Batch + Subject (mirrors mobile's assignTeacherToBatch)
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    if (!assignBatchId) {
      setAssignError("Please select a batch.");
      return;
    }
    if (!assignSubjectId) {
      setAssignError("Please select a subject.");
      return;
    }

    try {
      setIsSavingAssign(true);
      await apiClient.post("/admin/teacher-assignments", {
        teacherUserId: teacherId,
        batchId: assignBatchId,
        subjectId: assignSubjectId,
      });
      setIsAssignOpen(false);
      setAssignBatchId(null);
      setAssignSubjectId(null);
      await fetchData();
    } catch (err: any) {
      setAssignError(
        err?.response?.data?.error?.message || "Failed to assign teacher to this batch."
      );
    } finally {
      setIsSavingAssign(false);
    }
  };

  // Remove an existing assignment (mirrors mobile's inline chip ✕)
  const handleConfirmRemoveAssignment = async () => {
    if (!removingAssignment) return;
    try {
      setIsRemovingAssignment(true);
      await apiClient.delete(`/admin/teacher-assignments/${removingAssignment.id}`);
      setRemovingAssignment(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to remove this assignment.");
    } finally {
      setIsRemovingAssignment(false);
    }
  };

  // Confirm Delete Teacher
  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/admin/teachers/${teacherId}`);
      setIsDeleteModalOpen(false);
      router.push("/teachers");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to remove teacher account.");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-chalk-teal" />
          <p className="text-xs text-slate-500 font-medium">Loading Teacher Details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !teacher) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold font-display text-slate-900 mb-2">Teacher Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">{error || "The requested teacher account could not be found."}</p>
          <Button href="/teachers" variant="primary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Teachers Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = teacher.status || "active";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              href="/teachers"
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Teachers
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <nav className="text-xs text-slate-500 flex items-center gap-1.5">
              <Link href="/teachers" className="hover:text-slate-900 transition-colors">
                Teachers
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-800">{teacher.fullName}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              href={`https://wa.me/91${teacher.phone}`}
              target="_blank"
              variant="outline"
              size="sm"
              icon={<Phone className="w-3.5 h-3.5 text-emerald-600" />}
            >
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditFullName(teacher.fullName || "");
                setEditPhone(teacher.phone || "");
                setEditEmail(teacher.email || "");
                setEditError(null);
                setIsEditOpen(true);
              }}
            >
              Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Calendar className="w-3.5 h-3.5" />}
              onClick={() => {
                setStatusVal(teacher.status || "active");
                setLeaveStart(teacher.leaveStart ? teacher.leaveStart.split("T")[0] : "");
                setLeaveEnd(teacher.leaveEnd ? teacher.leaveEnd.split("T")[0] : "");
                setStatusError(null);
                setIsStatusOpen(true);
              }}
            >
              Status &amp; Leave
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Remove
            </Button>
          </div>
        </div>

        {/* Profile Banner Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-chalk-teal/10 border border-chalk-teal/20 text-chalk-teal flex items-center justify-center font-bold font-display text-2xl shrink-0">
                {teacher.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
                    {teacher.fullName}
                  </h1>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/80">
                    ID #{teacher.id}
                  </span>
                  {/* Status Badge */}
                  {status === "on_leave" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      <Palmtree className="w-3.5 h-3.5" />
                      <span>
                        On Leave
                        {teacher.leaveStart && (
                          <span className="ml-1 text-[11px] font-normal opacity-90">
                            ({new Date(teacher.leaveStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            {teacher.leaveEnd ? ` → ${new Date(teacher.leaveEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                            )
                          </span>
                        )}
                      </span>
                    </span>
                  ) : status === "inactive" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Inactive</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    +91 {teacher.phone}
                  </span>
                  {teacher.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {teacher.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    Teacher &amp; Staff Account
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <Button
                variant="outline"
                size="sm"
                icon={<Calendar className="w-3.5 h-3.5" />}
                onClick={() => {
                  setStatusVal(teacher.status || "active");
                  setLeaveStart(teacher.leaveStart ? teacher.leaveStart.split("T")[0] : "");
                  setLeaveEnd(teacher.leaveEnd ? teacher.leaveEnd.split("T")[0] : "");
                  setStatusError(null);
                  setIsStatusOpen(true);
                }}
              >
                Change Status / Leave
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Assigned Batches
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 mt-1">
              {assignedBatchesList.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {assignedBatchesList.length === 1 ? "1 active batch" : `${assignedBatchesList.length} active batches`}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Subjects Taught
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 mt-1">
              {assignedSubjectsList.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
              {assignedSubjectsList.join(", ") || "No subjects yet"}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Weekly Classes
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 mt-1">
              {timetable.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {timetable.length === 1 ? "1 scheduled slot" : `${timetable.length} scheduled slots / week`}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              App Login Status
            </span>
            <div className="text-2xl font-bold font-display text-emerald-700 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Active</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Mobile app enabled
            </span>
          </div>
        </div>

        {/* 2 Column Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Contact & Account Profile (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contact &amp; Login Details
                </h3>
                <button
                  onClick={() => {
                    setEditFullName(teacher.fullName || "");
                    setEditPhone(teacher.phone || "");
                    setEditEmail(teacher.email || "");
                    setEditError(null);
                    setIsEditOpen(true);
                  }}
                  className="text-xs font-semibold text-chalk-teal hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Mobile Phone (Teacher App Login)
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900 text-sm">
                      +91 {teacher.phone}
                    </span>
                    <a
                      href={`https://wa.me/91${teacher.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Email Address
                  </span>
                  <span className="text-slate-800 font-medium">
                    {teacher.email || "No email address registered"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    System Account Role
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-chalk-teal" />
                    Teacher / Faculty Member
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
                  Teachers log in to the CampusWeb Teacher App on Android using their registered mobile number (+91 {teacher.phone}).
                </div>
              </div>
            </div>

            {/* Status & Leave Record Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Duty Status &amp; Leave
                </h3>
                <button
                  onClick={() => {
                    setStatusVal(teacher.status || "active");
                    setLeaveStart(teacher.leaveStart ? teacher.leaveStart.split("T")[0] : "");
                    setLeaveEnd(teacher.leaveEnd ? teacher.leaveEnd.split("T")[0] : "");
                    setStatusError(null);
                    setIsStatusOpen(true);
                  }}
                  className="text-xs font-semibold text-chalk-teal hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Update</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Standing:</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {status.replace("_", " ")}
                  </span>
                </div>

                {status === "on_leave" && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                      <Palmtree className="w-4 h-4 text-amber-600" />
                      <span>On Approved Leave</span>
                    </div>
                    <div className="text-[11px] text-amber-700">
                      <div>From: <strong className="font-semibold">{teacher.leaveStart ? new Date(teacher.leaveStart).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong></div>
                      <div>To: <strong className="font-semibold">{teacher.leaveEnd ? new Date(teacher.leaveEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Indefinite"}</strong></div>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    setStatusVal(teacher.status || "active");
                    setLeaveStart(teacher.leaveStart ? teacher.leaveStart.split("T")[0] : "");
                    setLeaveEnd(teacher.leaveEnd ? teacher.leaveEnd.split("T")[0] : "");
                    setStatusError(null);
                    setIsStatusOpen(true);
                  }}
                >
                  Change Status / Set Leave
                </Button>
              </div>
            </div>

            {/* Danger Zone: Remove Teacher */}
            <div className="bg-red-50/40 rounded-2xl border border-red-200/60 p-5">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                Danger Zone
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Permanently revoke teacher access and remove their account from your institute portal.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Remove Teacher Account
              </Button>
            </div>
          </div>

          {/* Right Column: Assigned Batches & Weekly Timetable (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Assigned Batches */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Assigned Batches &amp; Subjects
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Batches &amp; subjects this teacher is assigned to teach.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  icon={<Plus className="w-3 h-3" />}
                  onClick={() => {
                    setAssignBatchId(null);
                    setAssignSubjectId(null);
                    setAssignError(null);
                    setIsAssignOpen(true);
                  }}
                >
                  Assign
                </Button>
              </div>

              {assignments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs font-medium text-slate-800"
                    >
                      <span>
                        {a.batchName} <span className="text-slate-400">•</span> {a.subjectName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRemovingAssignment(a)}
                        title="Remove assignment"
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium">No batches assigned yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Assign this teacher to a batch and subject to get started.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setAssignBatchId(null);
                      setAssignSubjectId(null);
                      setAssignError(null);
                      setIsAssignOpen(true);
                    }}
                  >
                    Assign a Batch
                  </Button>
                </div>
              )}
            </div>

            {/* Weekly Timetable Schedule */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Weekly Teaching Timetable
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Class schedule for this teacher across all days of the week.
                  </p>
                </div>
                <Button href="/batches?tab=timetable" variant="outline" size="xs">
                  Full Timetable
                </Button>
              </div>

              {groupedSchedule.length > 0 ? (
                <div className="space-y-4">
                  {groupedSchedule.map((group) => (
                    <div key={group.dayIndex} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {group.dayName}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {group.slots.length} {group.slots.length === 1 ? "class" : "classes"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {group.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-chalk-teal/10 text-chalk-teal flex items-center justify-center font-semibold shrink-0">
                                <Clock className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-2">
                                  <span>{slot.subject}</span>
                                  <span className="text-[10px] font-normal text-slate-400">•</span>
                                  <span className="text-xs font-medium text-slate-600">{slot.batch}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {slot.startTime} – {slot.endTime}
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Scheduled
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium">No scheduled classes found.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Add teaching slots to this teacher’s weekly timetable from the Batches page.
                  </p>
                  <Button
                    href="/batches?tab=timetable"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Schedule a Class
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            DRAWER 1: EDIT PROFILE
            ════════════════════════════════════════════════════════════ */}
        <Drawer
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditError(null);
          }}
          title="Edit Teacher Profile"
          description="Update contact and personal details for this teacher."
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mobile Number (Teacher App Login) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Used to log into the mobile teacher app.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address (App Recovery) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="teacher@institute.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Required — used by educator to reset &amp; change password in the mobile app.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSavingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Drawer>

        {/* ════════════════════════════════════════════════════════════
            DRAWER 2: CHANGE STATUS / SET LEAVE
            ════════════════════════════════════════════════════════════ */}
        <Drawer
          isOpen={isStatusOpen}
          onClose={() => {
            setIsStatusOpen(false);
            setStatusError(null);
          }}
          title="Duty Status &amp; Leave Management"
          description="Update active status or schedule leave dates for this teacher."
        >
          <form onSubmit={handleSaveStatus} className="space-y-4">
            {statusError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Duty Status
              </label>
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all",
                    statusVal === "active"
                      ? "border-emerald-300 bg-emerald-50/50 text-emerald-950 font-semibold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={statusVal === "active"}
                      onChange={() => setStatusVal("active")}
                      className="text-chalk-teal focus:ring-chalk-teal"
                    />
                    <span>Active (On Duty)</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </label>

                <label
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all",
                    statusVal === "on_leave"
                      ? "border-amber-300 bg-amber-50/50 text-amber-950 font-semibold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="status"
                      value="on_leave"
                      checked={statusVal === "on_leave"}
                      onChange={() => setStatusVal("on_leave")}
                      className="text-chalk-teal focus:ring-chalk-teal"
                    />
                    <span>On Leave (Vacation / Sick / Personal)</span>
                  </div>
                  <Palmtree className="w-4 h-4 text-amber-600" />
                </label>

                <label
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all",
                    statusVal === "inactive"
                      ? "border-slate-400 bg-slate-100 text-slate-900 font-semibold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={statusVal === "inactive"}
                      onChange={() => setStatusVal("inactive")}
                      className="text-chalk-teal focus:ring-chalk-teal"
                    />
                    <span>Inactive (Suspended / Relieved)</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </label>
              </div>
            </div>

            {statusVal === "on_leave" && (
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                  Leave Date Range
                </span>
                <div>
                  <CustomDatePicker
                    label="Leave Start Date *"
                    value={leaveStart}
                    onChange={(val) => setLeaveStart(val)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <CustomDatePicker
                    label="Leave End Date (Optional)"
                    value={leaveEnd}
                    onChange={(val) => setLeaveEnd(val)}
                    placeholder="YYYY-MM-DD"
                  />
                  <p className="text-[10px] text-amber-700/80 mt-1">
                    Leave blank if end date is not decided yet.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStatusOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSavingStatus}
              >
                Update Status
              </Button>
            </div>
          </form>
        </Drawer>

        {/* ════════════════════════════════════════════════════════════
            DRAWER 3: ASSIGN TEACHER TO BATCH + SUBJECT
            ════════════════════════════════════════════════════════════ */}
        <Drawer
          isOpen={isAssignOpen}
          onClose={() => {
            setIsAssignOpen(false);
            setAssignError(null);
          }}
          title="Assign to Batch &amp; Subject"
          description="Link this teacher to a batch and the subject they'll teach there."
        >
          <form onSubmit={handleAssign} className="space-y-4">
            {assignError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            <div>
              <CustomSelect
                label="Batch *"
                options={batches.map((b) => ({
                  label: `${b.name}${b.grade ? ` (${b.grade})` : ""}`,
                  value: b.id,
                }))}
                value={assignBatchId}
                onChange={(val) => {
                  setAssignBatchId(val);
                  setAssignSubjectId(null);
                }}
                placeholder="Select batch..."
                searchable
              />
            </div>

            <div>
              <CustomSelect
                label="Subject *"
                options={assignSubjectOptions}
                value={assignSubjectId}
                onChange={(val) => setAssignSubjectId(val)}
                placeholder={assignBatchId ? "Select subject..." : "Select a batch first"}
                disabled={!assignBatchId}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Only subjects covered by the selected batch are shown.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSavingAssign}>
                Assign Teacher
              </Button>
            </div>
          </form>
        </Drawer>

        {/* ════════════════════════════════════════════════════════════
            MODAL: REMOVE ASSIGNMENT CONFIRMATION
            ════════════════════════════════════════════════════════════ */}
        <ConfirmModal
          isOpen={!!removingAssignment}
          onClose={() => setRemovingAssignment(null)}
          onConfirm={handleConfirmRemoveAssignment}
          title="Remove This Assignment?"
          message={
            <span>
              Remove {teacher.fullName} from{" "}
              <strong className="text-slate-900">
                {removingAssignment?.batchName} • {removingAssignment?.subjectName}
              </strong>
              ? They will no longer appear in this batch&apos;s subject roster.
            </span>
          }
          confirmText="Yes, Remove"
          cancelText="Cancel"
          variant="danger"
          isLoading={isRemovingAssignment}
        />

        {/* ════════════════════════════════════════════════════════════
            MODAL 3: DELETE TEACHER CONFIRMATION
            ════════════════════════════════════════════════════════════ */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Remove Teacher Account?"
          message={
            <span>
              Are you sure you want to permanently remove{" "}
              <strong className="text-slate-900">{teacher.fullName}</strong>? This action will revoke their mobile app login and unassign them from scheduled batches.
            </span>
          }
          confirmText="Yes, Remove Account"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}

