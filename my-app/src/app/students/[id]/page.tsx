"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  CreditCard,
  BookOpen,
  Award,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  XCircle,
  Loader2,
  Share2,
  IndianRupee,
  Receipt,
  UserCheck,
  UserX,
  Edit2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/utils/cn";

const GRADE_OPTIONS: Option[] = [
  { label: "Class 9th", value: "Class 9th" },
  { label: "Class 10th", value: "Class 10th" },
  { label: "Class 11th (Science)", value: "Class 11th - Science" },
  { label: "Class 11th (Commerce)", value: "Class 11th - Commerce" },
  { label: "Class 12th (Science)", value: "Class 12th - Science" },
  { label: "Class 12th (Commerce)", value: "Class 12th - Commerce" },
  { label: "JEE Main / Advanced", value: "JEE" },
  { label: "NEET Medical", value: "NEET" },
  { label: "Foundation", value: "Foundation" },
];

interface Batch {
  id: number;
  name: string;
  grade?: string | null;
}

interface SubjectScore {
  name: string;
  marks: number;
  total: number;
  grade: string;
}

interface AttendanceMonthly {
  month: string;
  total: number;
  present: number;
}

interface FeePaymentItem {
  date: string;
  amount: number;
  method: string;
  receiptNo: string;
  desc: string;
}

interface FeeDueItem {
  id: number;
  title: string;
  amount: number;
  dueDate: string | null;
}

interface StudentDetailsData {
  rollNo?: string;
  grade?: string;
  isActive?: boolean;
  student?: {
    id: number;
    fullName: string;
    phone: string;
    parentName?: string;
    parentPhone?: string;
    batchName?: string;
  };
  academics: {
    overallGrade: string;
    overallPct: number;
    subjects: SubjectScore[];
    tests: {
      attempted: number;
      missed: number;
      total: number;
    };
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    rate: number;
    monthly: AttendanceMonthly[];
  };
  fees: {
    total: number;
    paid: number;
    pending: number;
    history: FeePaymentItem[];
    dues: FeeDueItem[];
  };
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const router = useRouter();
  const { tenant } = useAuthStore();
  const instituteName = tenant?.name || "Institute of Learning";

  const [data, setData] = useState<StudentDetailsData | null>(null);
  const [studentInfo, setStudentInfo] = useState<{
    id: number;
    fullName: string;
    phone: string;
    parentName?: string;
    parentPhone?: string;
    batchId?: number | null;
    batchName?: string;
    rollNo?: string;
    grade?: string;
    feeOverrideAmount?: number | null;
  } | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "academics" | "attendance" | "fees">("overview");
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [courseFeeInput, setCourseFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  // Edit Student drawer (mirrors the mobile app's edit dialog: fullName,
  // phone, password, parent details, batch, grade, rollNo, fee override)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editGrade, setEditGrade] = useState<string | null>(null);
  const [editRollNo, setEditRollNo] = useState("");
  const [editBatchId, setEditBatchId] = useState<number | null>(null);
  const [editFeeOverride, setEditFeeOverride] = useState("");

  const handleSaveCourseFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(courseFeeInput);
    if (!amount || amount <= 0) return;

    try {
      setSavingFee(true);
      await apiClient.put(`/admin/students/${studentId}`, {
        feeOverrideAmount: amount,
      });
      setIsFeeModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to update course fee.");
    } finally {
      setSavingFee(false);
    }
  };

  const openEditDrawer = () => {
    if (!studentInfo) return;
    setEditFullName(studentInfo.fullName || "");
    setEditPhone(studentInfo.phone || "");
    setEditPassword("");
    setEditParentName(studentInfo.parentName || "");
    setEditParentPhone(studentInfo.parentPhone || "");
    setEditGrade(studentInfo.grade || null);
    setEditRollNo(studentInfo.rollNo || "");
    setEditBatchId(studentInfo.batchId ?? null);
    setEditFeeOverride(
      studentInfo.feeOverrideAmount != null ? String(studentInfo.feeOverrideAmount) : ""
    );
    setEditError(null);
    setIsEditDrawerOpen(true);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const cleanStudentPhone = editPhone.replace(/\D/g, "");
    const cleanParentPhone = editParentPhone.replace(/\D/g, "");

    if (!editFullName.trim()) {
      setEditError("Student full name is required.");
      return;
    }
    if (cleanStudentPhone.length !== 10) {
      setEditError("Please enter a valid 10-digit student mobile number.");
      return;
    }
    if (cleanParentPhone.length !== 10) {
      setEditError("Please enter a valid 10-digit parent mobile number.");
      return;
    }
    if (!editBatchId) {
      setEditError("Please select a batch for the student.");
      return;
    }

    setEditSubmitting(true);
    try {
      await apiClient.put(`/admin/students/${studentId}`, {
        fullName: editFullName.trim(),
        phone: cleanStudentPhone,
        password: editPassword ? editPassword : undefined,
        parentName: editParentName.trim(),
        parentPhone: cleanParentPhone,
        grade: editGrade || "",
        rollNo: editRollNo.trim(),
        batchId: Number(editBatchId),
        feeOverrideAmount: editFeeOverride ? Number(editFeeOverride) : undefined,
      });
      setIsEditDrawerOpen(false);
      fetchData();
    } catch (err: any) {
      setEditError(
        err?.response?.data?.error?.message || err?.message || "Failed to update student."
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch student details from API
      const [detailsRes, studentsListRes, batchesRes] = await Promise.allSettled([
        apiClient.get(`/admin/students/${studentId}/details`),
        apiClient.get(`/admin/students`),
        apiClient.get(`/admin/batches`),
      ]);

      if (detailsRes.status === "fulfilled") {
        setData(detailsRes.value.data);
      } else {
        throw new Error(
          detailsRes.reason?.response?.data?.error?.message ||
            "Failed to load student details"
        );
      }

      if (studentsListRes.status === "fulfilled") {
        const match = (studentsListRes.value.data || []).find(
          (s: any) => String(s.id) === String(studentId)
        );
        if (match) {
          setStudentInfo({
            id: match.id,
            fullName: match.fullName || match.name || "Student",
            phone: match.phone || "",
            parentName: match.parentName || "",
            parentPhone: match.parentPhone || "",
            batchId: match.batchId ?? null,
            batchName: match.batchName || "Assigned Batch",
            rollNo: match.rollNo || "",
            grade: match.grade || "",
            feeOverrideAmount: match.feeOverrideAmount ?? null,
          });
        }
      }

      if (batchesRes.status === "fulfilled") {
        const batchList = Array.isArray(batchesRes.value.data)
          ? batchesRes.value.data
          : batchesRes.value.data?.batches || [];
        setBatches(batchList);
      }
    } catch (err: any) {
      console.error("Error loading student:", err);
      setError(err?.response?.data?.error?.message || err?.message || "Failed to load student");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center text-xs text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-chalk-teal mb-3" />
          Loading Student Profile & Academic Report...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="p-12 bg-white rounded-2xl border border-red-200 text-center max-w-md mx-auto mt-8">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900">Student Profile Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">{error || "Could not retrieve records for this student."}</p>
          <button
            onClick={() => router.push("/students")}
            className="mt-4 px-4 py-2 rounded-xl bg-ink-green text-white text-xs font-semibold"
          >
            Back to Student Directory
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const name = studentInfo?.fullName || "Student";
  const rollNo = data.rollNo || studentInfo?.rollNo || `ID #${studentId}`;
  const batchName = studentInfo?.batchName || "Enrolled Batch";
  const grade = data.grade || studentInfo?.grade || "Class";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const totalAttDays = data.attendance?.totalDays || 0;
  const presentDays = data.attendance?.presentDays || 0;
  const attRate = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 print:hidden">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student Directory</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              onClick={openEditDrawer}
              variant="secondary"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5 text-slate-500" />}
            >
              Edit Student
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5 text-slate-500" />}
            >
              Print Student Report
            </Button>
          </div>
        </div>

        {/* Student Identity Hero Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1F2E27] text-white font-bold font-display text-xl flex items-center justify-center shrink-0 shadow-md">
              {initials}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">
                  {name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {rollNo}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Enrolled & Active</span>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-body">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-chalk-teal" />
                  <span>{batchName}</span>
                </div>
                {grade && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-brass-gold" />
                    <span>Grade {grade}</span>
                  </div>
                )}
                {studentInfo?.phone && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>+91 {studentInfo.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact & WhatsApp Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {studentInfo?.phone && (
              <a
                href={`https://wa.me/91${studentInfo.phone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>WhatsApp Student</span>
              </a>
            )}
            {studentInfo?.parentPhone && (
              <a
                href={`https://wa.me/91${studentInfo.parentPhone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>WhatsApp Parent</span>
              </a>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Overall Academic Grade */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Academic Grade</span>
              <Award className="w-4 h-4 text-brass-gold" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-slate-900 flex items-baseline gap-2">
              <span>{data.academics?.overallGrade || "N/A"}</span>
              {data.academics?.overallPct ? (
                <span className="text-xs font-semibold text-emerald-700">
                  {Math.round(data.academics.overallPct * 100)}%
                </span>
              ) : null}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Across all completed assessments</p>
          </div>

          {/* Attendance Reliability */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Attendance Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-slate-900">
              {attRate}%
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  attRate >= 75 ? "bg-emerald-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, attRate)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {presentDays} present of {totalAttDays} classes
            </p>
          </div>

          {/* Test Performance */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Tests Attempted</span>
              <FileText className="w-4 h-4 text-chalk-teal" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-slate-900">
              {data.academics?.tests?.attempted || 0}
              <span className="text-xs text-slate-400 font-normal ml-1">
                / {data.academics?.tests?.total || 0} total
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {data.academics?.tests?.missed || 0} missed or expired
            </p>
          </div>

          {/* Fee Balance */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pending Fee</span>
              <IndianRupee className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-slate-900">
              ₹{(data.fees?.pending || 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              ₹{(data.fees?.paid || 0).toLocaleString("en-IN")} paid of ₹
              {(data.fees?.total || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Edit Course Fee Modal */}
        {isFeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsFeeModalOpen(false)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-slide-up z-10">
              <h3 className="text-sm font-bold font-display text-slate-900">
                {data.fees?.total ? "Update Agreed Course Fee" : "Set Agreed Course Fee"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Set total course fee for {name}. This updates the student's expected fee and pending balance.
              </p>
              <form onSubmit={handleSaveCourseFee} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                    Total Fee Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={courseFeeInput}
                      onChange={(e) => setCourseFeeInput(e.target.value)}
                      placeholder="e.g. 21000"
                      className="w-full pl-7 pr-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal font-mono text-slate-900 bg-slate-50/50"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFeeModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFee}
                    className="px-4 py-2 rounded-xl bg-ink-green text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {savingFee && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Save Course Fee</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Student Drawer — mirrors the mobile app's edit-student dialog */}
        <Drawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          title="Edit Student"
          description="Update this student's profile, batch, and credentials."
          width="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsEditDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-student-form"
                disabled={editSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
              >
                {editSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </>
          }
        >
          <form id="edit-student-form" onSubmit={handleEditStudent} className="space-y-4">
            {editError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="e.g. Aman Sharma"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Student Mobile Number *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-semibold text-slate-400 pointer-events-none">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="w-full pl-11 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parent Name
                </label>
                <input
                  type="text"
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  placeholder="Father / Guardian"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parent Phone *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold text-slate-400 pointer-events-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                    className="w-full pl-11 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <CustomSelect
                label="Assigned Batch *"
                options={batches.map((b) => ({
                  label: `${b.name}${b.grade ? ` (${b.grade})` : ""}`,
                  value: b.id,
                }))}
                value={editBatchId}
                onChange={(val) => setEditBatchId(val)}
                placeholder="Select Batch..."
                searchable
              />
            </div>

            <div>
              <CustomSelect
                label="Class / Grade Level"
                options={GRADE_OPTIONS}
                value={editGrade}
                onChange={(val) => setEditGrade(val)}
                placeholder="Select Class/Grade..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={editRollNo}
                  onChange={(e) => setEditRollNo(e.target.value)}
                  placeholder="e.g. 101 or G-302"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Agreed Course Fee (₹)</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(optional — defaults to batch fee)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                <input
                  type="number"
                  min={0}
                  value={editFeeOverride}
                  onChange={(e) => setEditFeeOverride(e.target.value)}
                  placeholder="e.g. 21000"
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                />
              </div>
            </div>
          </form>
        </Drawer>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "pb-3 border-b-2 transition-colors cursor-pointer",
              activeTab === "overview"
                ? "border-chalk-teal text-chalk-teal"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Overview &amp; Guardian Info
          </button>
          <button
            onClick={() => setActiveTab("academics")}
            className={cn(
              "pb-3 border-b-2 transition-colors cursor-pointer",
              activeTab === "academics"
                ? "border-chalk-teal text-chalk-teal"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Subject Grades &amp; Tests
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={cn(
              "pb-3 border-b-2 transition-colors cursor-pointer",
              activeTab === "attendance"
                ? "border-chalk-teal text-chalk-teal"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Monthly Attendance
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={cn(
              "pb-3 border-b-2 transition-colors cursor-pointer",
              activeTab === "fees"
                ? "border-chalk-teal text-chalk-teal"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Fee Receipts &amp; Ledger
          </button>
        </div>

        {/* TAB 1: OVERVIEW & GUARDIAN */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guardian & Contact */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Guardian &amp; Emergency Contact
              </h3>

              <div className="space-y-3 text-xs font-body">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Parent / Guardian:</span>
                  <span className="font-semibold text-slate-900">
                    {studentInfo?.parentName || "Not provided"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Parent Mobile:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {studentInfo?.parentPhone ? `+91 ${studentInfo.parentPhone}` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Student Mobile:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {studentInfo?.phone ? `+91 ${studentInfo.phone}` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Enrolled Batch:</span>
                  <span className="font-semibold text-slate-900">{batchName}</span>
                </div>
              </div>
            </div>

            {/* Quick Fee Snapshot */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Fee Account Summary
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCourseFeeInput(String(data.fees?.total || ""));
                    setIsFeeModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-chalk-teal hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{data.fees?.total ? "Edit Course Fee" : "Set Course Fee"}</span>
                </button>
              </div>

              <div className="space-y-3 text-xs font-body">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500">Total Agreed Course Fee:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{(data.fees?.total || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800">
                  <span>Total Collected so far:</span>
                  <span className="font-bold">
                    ₹{(data.fees?.paid || 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 border border-red-100 text-red-800">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-bold">
                    ₹{(data.fees?.pending || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/fees?action=record&studentId=${studentId}`}
                  className="block w-full py-2.5 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold text-center transition-colors shadow-xs"
                >
                  Record Fee Payment for {name}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMICS & SUBJECTS */}
        {activeTab === "academics" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Subject-Wise Test Breakdown
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Overall Grade: <strong className="text-slate-900">{data.academics?.overallGrade || "N/A"}</strong>
              </span>
            </div>

            {data.academics?.subjects && data.academics.subjects.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.academics.subjects.map((sub, i) => {
                  const pct = sub.total > 0 ? Math.round((sub.marks / sub.total) * 100) : 0;
                  return (
                    <div key={i} className="p-4 flex items-center justify-between text-xs font-body">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Score: {sub.marks} / {sub.total} marks ({pct}%)
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-28 bg-slate-100 rounded-full h-2 hidden sm:block">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>

                        <span
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs",
                            sub.grade === "A"
                              ? "bg-emerald-100 text-emerald-800"
                              : sub.grade === "B"
                              ? "bg-sky-100 text-sky-800"
                              : sub.grade === "C"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {sub.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-body">
                No evaluated test submissions on record yet for this student.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ATTENDANCE MONTHLY */}
        {activeTab === "attendance" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Monthly Attendance Breakdown
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Overall Present Rate: <strong className="text-emerald-700">{attRate}%</strong>
              </span>
            </div>

            {data.attendance?.monthly && data.attendance.monthly.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.attendance.monthly.map((m, i) => {
                  const mRate = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
                  return (
                    <div key={i} className="p-4 flex items-center justify-between text-xs font-body">
                      <div>
                        <div className="font-bold text-slate-900">{m.month}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {m.present} classes attended out of {m.total} conducted
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            mRate >= 75
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          )}
                        >
                          {mRate}% Present
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-body">
                No attendance attendance records logged for this student yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FEES & RECEIPTS */}
        {activeTab === "fees" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Payment History &amp; Issued Receipts
              </h3>
              <Link
                href={`/fees?action=record&studentId=${studentId}`}
                className="text-xs font-semibold text-chalk-teal hover:underline"
              >
                + Record New Payment
              </Link>
            </div>

            {data.fees?.history && data.fees.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-body">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.fees.history.map((pay, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {pay.receiptNo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(pay.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{pay.desc}</td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-500">
                          {pay.method}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          ₹{Number(pay.amount).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 font-body">
                No fee payment records found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          OFFICIAL PRINTABLE STUDENT REPORT CARD (Visible ONLY during print/PDF)
          Strictly matched with Mobile App Report Card & Concluded in 1 Page
          ════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block font-body p-6 text-slate-900 bg-white w-full max-h-[285mm] overflow-hidden page-single print-single-page">
        {/* Top Header: Matching App Report Header */}
        <div className="pb-2.5 mb-2.5 flex items-center justify-between border-b-2 border-[#1F2E27]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1F2E27] text-white flex items-center justify-center font-bold text-base font-display">
              {instituteName ? instituteName[0].toUpperCase() : "G"}
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight text-[#1F2E27] uppercase">
                {instituteName}
              </h1>
              <p className="text-[9px] font-bold text-slate-400 tracking-wider">
                LEARN • GROW • ACHIEVE
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-bold font-display tracking-tight text-[#1F2E27] block">
              STUDENT REPORT CARD
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Ref: CW-STU-{studentId}
            </span>
          </div>
        </div>

        {/* Info Ribbon: Matching App Dark Green Banner */}
        <div className="bg-[#1F2E27] text-white rounded-lg px-4 py-2 mb-2.5 flex items-center justify-between text-xs">
          <div>
            <span className="text-[9px] text-white/70 block uppercase tracking-wider">Batch</span>
            <span className="font-bold text-xs">{batchName}</span>
          </div>
          <div>
            <span className="text-[9px] text-white/70 block uppercase tracking-wider">Academic Year</span>
            <span className="font-bold text-xs">{new Date().getFullYear()} - {(new Date().getFullYear() + 1).toString().slice(2)}</span>
          </div>
          <div>
            <span className="text-[9px] text-white/70 block uppercase tracking-wider">Generated On</span>
            <span className="font-bold text-xs font-mono">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>

        {/* Student Profile Box */}
        <div className="border border-slate-300 rounded-lg p-2.5 mb-2.5 bg-slate-50/60">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div>
              <span className="font-semibold text-slate-500 uppercase text-[9px] block">Student Name:</span>
              <span className="font-bold text-xs text-slate-900">{name}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase text-[9px] block">Roll Number:</span>
              <span className="font-mono font-bold text-xs text-slate-900">{rollNo}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase text-[9px] block">Class / Grade Level:</span>
              <span className="font-semibold text-slate-800 text-xs">{grade || "General"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase text-[9px] block">Student Contact:</span>
              <span className="font-mono text-slate-800 text-xs">{studentInfo?.phone ? `+91 ${studentInfo.phone}` : "—"}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-slate-500 uppercase text-[9px] block">Parent / Guardian:</span>
              <span className="text-slate-800 font-medium text-xs">
                {studentInfo?.parentName || "—"} {studentInfo?.parentPhone ? `(+91 ${studentInfo.parentPhone})` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          <div className="border border-slate-200 rounded-lg p-2 text-center bg-white">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Academic Grade</span>
            <span className="text-base font-bold font-display text-slate-900 mt-0.5 block">
              {data.academics?.overallGrade || "N/A"}
            </span>
            <span className="text-[9px] text-slate-500">
              {data.academics?.overallPct ? `${Math.round(data.academics.overallPct * 100)}% Avg` : "Evaluated"}
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg p-2 text-center bg-white">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Attendance Rate</span>
            <span className="text-base font-bold font-display text-slate-900 mt-0.5 block">
              {attRate}%
            </span>
            <span className="text-[9px] text-slate-500">{presentDays} of {totalAttDays} Days</span>
          </div>

          <div className="border border-slate-200 rounded-lg p-2 text-center bg-white">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Tests Attempted</span>
            <span className="text-base font-bold font-display text-slate-900 mt-0.5 block">
              {data.academics?.tests?.attempted || 0} / {data.academics?.tests?.total || 0}
            </span>
            <span className="text-[9px] text-slate-500">{data.academics?.tests?.missed || 0} Missed</span>
          </div>

          <div className="border border-slate-200 rounded-lg p-2 text-center bg-white">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Pending Fee</span>
            <span className="text-base font-bold font-display text-slate-900 mt-0.5 block">
              ₹{(data.fees?.pending || 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[9px] text-slate-500">₹{(data.fees?.paid || 0).toLocaleString("en-IN")} Paid</span>
          </div>
        </div>

        {/* Subject-Wise Academic Breakdown */}
        <div className="mb-2.5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-1 border-b border-slate-200 pb-0.5">
            Subject-Wise Assessment Performance
          </h2>
          {data.academics?.subjects && data.academics.subjects.length > 0 ? (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-bold text-slate-700 uppercase">
                  <th className="py-1 px-2.5">Subject Name</th>
                  <th className="py-1 px-2.5 text-center">Marks Obtained</th>
                  <th className="py-1 px-2.5 text-center">Maximum Marks</th>
                  <th className="py-1 px-2.5 text-center">Percentage</th>
                  <th className="py-1 px-2.5 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.academics.subjects.map((sub, i) => {
                  const pct = sub.total > 0 ? Math.round((sub.marks / sub.total) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td className="py-1 px-2.5 font-semibold text-slate-800">{sub.name}</td>
                      <td className="py-1 px-2.5 text-center font-mono">{sub.marks}</td>
                      <td className="py-1 px-2.5 text-center font-mono">{sub.total}</td>
                      <td className="py-1 px-2.5 text-center font-semibold">{pct}%</td>
                      <td className="py-1 px-2.5 text-right font-bold">{sub.grade}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-500 italic p-1.5 border border-slate-200 rounded">
              No formal test submissions recorded for this student.
            </p>
          )}
        </div>

        {/* Fee Statement Table */}
        <div className="mb-2.5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 mb-1 border-b border-slate-200 pb-0.5">
            Fee Statement &amp; Payments Ledger
          </h2>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded mb-1.5 text-xs">
            <div>Total Course Fee: <strong className="font-mono">₹{(data.fees?.total || 0).toLocaleString("en-IN")}</strong></div>
            <div>Amount Paid: <strong className="font-mono text-emerald-700">₹{(data.fees?.paid || 0).toLocaleString("en-IN")}</strong></div>
            <div>Balance Pending: <strong className="font-mono text-red-700">₹{(data.fees?.pending || 0).toLocaleString("en-IN")}</strong></div>
          </div>

          {data.fees?.history && data.fees.history.length > 0 && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-bold text-slate-700 uppercase">
                  <th className="py-1 px-2.5">Receipt No</th>
                  <th className="py-1 px-2.5">Date</th>
                  <th className="py-1 px-2.5">Method</th>
                  <th className="py-1 px-2.5">Description</th>
                  <th className="py-1 px-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.fees.history.slice(0, 3).map((h, i) => (
                  <tr key={i}>
                    <td className="py-1 px-2.5 font-mono font-semibold">{h.receiptNo}</td>
                    <td className="py-1 px-2.5">{new Date(h.date).toLocaleDateString("en-IN")}</td>
                    <td className="py-1 px-2.5 uppercase font-medium">{h.method}</td>
                    <td className="py-1 px-2.5">{h.desc}</td>
                    <td className="py-1 px-2.5 text-right font-mono font-semibold">₹{Number(h.amount).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Signatures & Seal */}
        <div className="pt-3 border-t border-slate-300 mt-3 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 pb-4 mb-1"></div>
            <span className="font-semibold text-slate-700 text-[10px]">Class Educator / Mentor Signature</span>
          </div>
          <div>
            <div className="border-b border-slate-400 pb-4 mb-1"></div>
            <span className="font-semibold text-slate-700 text-[10px]">Authorized Signatory / Institute Seal</span>
          </div>
        </div>

        <div className="mt-2 text-center text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-1">
          CampusWeb Cloud ERP • Electronically Verified Student Academic Report
        </div>
      </div>
    </DashboardLayout>
  );
}
