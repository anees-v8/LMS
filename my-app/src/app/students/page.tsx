"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Edit2,
  Ban,
  Trash2,
  Loader2,
  X,
  CreditCard,
  UserCheck,
  UserX,
  Eye,
  ChevronRight,
  Filter,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

interface Student {
  id: number;
  userId?: number;
  name: string;
  fullName?: string;
  phone: string;
  parentName?: string | null;
  parentPhone: string;
  grade?: string | null;
  rollNo?: string | null;
  batchId?: number | null;
  batchName?: string | null;
  isActive: boolean;
  totalDays?: number;
  presentDays?: number;
  totalFees?: number;
  paidFees?: number;
  pendingFees?: number;
}

interface Batch {
  id: number;
  name: string;
  grade?: string | null;
  studentCount?: number;
}

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

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Confirmation modal state (replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: "danger" | "warning" | "info" | "success";
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "warning",
    onConfirm: async () => {},
    isLoading: false,
  });

  const [autoRollNo, setAutoRollNo] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string | number>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Drawer / Add Student state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // When set, the drawer is in "edit" mode for this student instead of "new admission"
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [rollNo, setRollNo] = useState("");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [password, setPassword] = useState("student123");
  const [courseFee, setCourseFee] = useState("");

  // Import Students drawer (mirrors import_students_bottom_sheet.dart)
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failureCount: number;
    failures: { row: number; fullName: string; reason: string }[];
  } | null>(null);

  // Listen for top navbar custom event & URL param ?action=new
  useEffect(() => {
    const handleOpen = () => setIsDrawerOpen(true);
    window.addEventListener("open-new-admission", handleOpen);
    return () => window.removeEventListener("open-new-admission", handleOpen);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    if (searchParams.get("action")) {
      router.replace("/students", { scroll: false });
    }
  };

  // Fetch Students & Batches
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, batchesRes] = await Promise.all([
        apiClient.get("/admin/students"),
        apiClient.get("/admin/batches"),
      ]);

      const rawList = Array.isArray(studentsRes.data)
        ? studentsRes.data
        : studentsRes.data?.students || [];
      const studentList = rawList.map((s: any) => ({
        ...s,
        name: s.fullName || s.name || "Student",
        fullName: s.fullName || s.name || "Student",
        isActive: s.isActive !== undefined ? Boolean(s.isActive) : true,
      }));

      const batchList = Array.isArray(batchesRes.data)
        ? batchesRes.data
        : batchesRes.data?.batches || [];

      setStudents(studentList);
      setBatches(batchList);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Form Submission (Add Student)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanStudentPhone = studentPhone.replace(/\D/g, "");
    const cleanParentPhone = parentPhone.replace(/\D/g, "");

    if (!fullName.trim()) {
      setFormError("Student full name is required.");
      return;
    }

    if (cleanStudentPhone.length !== 10) {
      setFormError("Please enter a valid 10-digit student mobile number.");
      return;
    }

    if (cleanParentPhone.length !== 10) {
      setFormError("Please enter a valid 10-digit parent mobile number.");
      return;
    }

    if (!batchId) {
      setFormError("Please select a batch for the student.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/admin/students", {
        fullName: fullName.trim(),
        phone: cleanStudentPhone,
        password: password || "student123",
        parentName: parentName.trim() || undefined,
        parentPhone: cleanParentPhone,
        grade: grade || undefined,
        rollNo: autoRollNo ? undefined : (rollNo.trim() || undefined),
        batchId: Number(batchId),
        feeOverrideAmount: courseFee ? Number(courseFee) : undefined,
      });

      // Reset form
      setFullName("");
      setStudentPhone("");
      setParentName("");
      setParentPhone("");
      setGrade(null);
      setRollNo("");
      setBatchId(null);
      setCourseFee("");
      setIsDrawerOpen(false);

      // Refresh data
      fetchData();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || "Failed to admit student.");
    } finally {
      setSubmitting(false);
    }
  };

  // Download the sample .xlsx import template
  const handleDownloadSample = async () => {
    setDownloadingSample(true);
    try {
      const res = await apiClient.get("/admin/students/import-sample", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "student-import-sample.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to download sample file.");
    } finally {
      setDownloadingSample(false);
    }
  };

  // Submit the chosen file for bulk import
  const handleImportStudents = async () => {
    if (!importFile) {
      setImportError("Please choose a file to import.");
      return;
    }
    setImportError(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await apiClient.post("/admin/students/import", formData);
      setImportResult(res.data);
      await fetchData();
    } catch (err: any) {
      setImportError(
        err?.response?.data?.error?.message || err?.message || "Failed to import students."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportDrawer = () => {
    setIsImportDrawerOpen(false);
    setImportFile(null);
    setImportError(null);
    setImportResult(null);
  };

  // Suspend / Unsuspend with Reusable Confirmation Modal
  const handleToggleSuspend = (student: Student) => {
    const isCurrentlyActive = student.isActive;
    const actionName = isCurrentlyActive ? "suspend" : "activate";
    const studentDisplayName = student.fullName || student.name || "Student";

    setConfirmModal({
      isOpen: true,
      title: isCurrentlyActive ? "Suspend Student Access" : "Activate Student Access",
      message: (
        <span>
          Are you sure you want to {actionName}{" "}
          <strong className="text-slate-900 font-semibold">{studentDisplayName}</strong>?{" "}
          {isCurrentlyActive
            ? "They will be temporarily blocked from logging into the mobile app and accessing upcoming classes."
            : "Their full access to live classes, daily attendance, tests, and student portal will be restored."}
        </span>
      ),
      confirmText: isCurrentlyActive ? "Yes, Suspend Account" : "Yes, Activate Account",
      variant: isCurrentlyActive ? "warning" : "success",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.patch(`/admin/students/${student.id}/suspend`);
          await fetchData();
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          alert(err?.response?.data?.message || "Failed to update student status.");
        }
      },
    });
  };

  // Delete Student with Reusable Danger Modal
  const handleDeleteStudent = (student: Student) => {
    const studentDisplayName = student.fullName || student.name || "Student";

    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete Student",
      message: (
        <span>
          Are you sure you want to permanently remove{" "}
          <strong className="text-slate-900 font-semibold">{studentDisplayName}</strong>? All batch enrollments, attendance history, and fee records for this student will be deleted. This action{" "}
          <strong className="text-red-600 font-semibold">cannot be undone</strong>.
        </span>
      ),
      confirmText: "Yes, Delete Student",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await apiClient.delete(`/admin/students/${student.id}`);
          await fetchData();
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err: any) {
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          alert(err?.response?.data?.message || "Failed to delete student.");
        }
      },
    });
  };

  // Filter Options for CustomSelect
  const batchFilterOptions: Option[] = [
    { label: "All Batches", value: "all" },
    ...batches.map((b) => ({
      label: `${b.name} (${b.studentCount ?? 0})`,
      value: b.id,
    })),
  ];

  const statusFilterOptions: Option[] = [
    { label: "All Status", value: "all" },
    { label: "Active", value: "active" },
    { label: "Suspended", value: "suspended" },
  ];

  const batchSelectOptions: Option[] = batches.map((b) => ({
    label: `${b.name} ${b.grade ? `(${b.grade})` : ""}`,
    value: b.id,
    description: `${b.studentCount ?? 0} students enrolled`,
  }));

  // Filtering Logic
  const filteredStudents = students.filter((s) => {
    // Search query match
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.parentPhone?.includes(q) ||
      s.rollNo?.toLowerCase().includes(q);

    // Batch match
    const matchesBatch =
      selectedBatchFilter === "all" ||
      s.batchId === Number(selectedBatchFilter);

    // Status match
    const matchesStatus =
      selectedStatusFilter === "all" ||
      (selectedStatusFilter === "active" && s.isActive) ||
      (selectedStatusFilter === "suspended" && !s.isActive);

    return matchesSearch && matchesBatch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ─── Header: Title & Action Button ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-green tracking-tight">
              Student Directory
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage enrollments, batch assignments, and contact profiles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Refresh Students"
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => {
                setImportFile(null);
                setImportError(null);
                setImportResult(null);
                setIsImportDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Students</span>
            </button>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Admission</span>
            </button>
          </div>
        </div>

        {/* ─── Filter Bar: Search, CustomSelects ─── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, or phone..."
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

          {/* Custom Batch Dropdown */}
          <div className="w-full md:w-56">
            <CustomSelect
              options={batchFilterOptions}
              value={selectedBatchFilter}
              onChange={(val) => setSelectedBatchFilter(val)}
              placeholder="Filter by Batch"
            />
          </div>

          {/* Custom Status Dropdown */}
          <div className="w-full md:w-44">
            <CustomSelect
              options={statusFilterOptions}
              value={selectedStatusFilter}
              onChange={(val) => setSelectedStatusFilter(val)}
              placeholder="Filter by Status"
            />
          </div>
        </div>

        {/* ─── Students Data Table ─── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table Header Info */}
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of {students.length} students
            </span>
            {(searchQuery || selectedBatchFilter !== "all" || selectedStatusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBatchFilter("all");
                  setSelectedStatusFilter("all");
                }}
                className="text-xs text-ink-green font-semibold hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Loading / Error / Empty States */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
              <p className="text-xs font-semibold text-slate-500">Loading student directory...</p>
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
          ) : filteredStudents.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No students found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try adjusting your search criteria or register a new student.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-6">Student</th>
                    <th className="py-3.5 px-6">Batch & Grade</th>
                    <th className="py-3.5 px-6">Contact Details</th>
                    <th className="py-3.5 px-6">Attendance</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const initials = student.name
                      ? student.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
                      : "ST";

                    const attendancePct =
                      student.totalDays && student.totalDays > 0
                        ? Math.round(((student.presentDays ?? 0) / student.totalDays) * 100)
                        : null;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Student Name & Roll No */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-chalk-teal/15 text-chalk-teal font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <Link
                                href={`/students/${student.id}`}
                                className="font-semibold text-slate-900 leading-snug hover:text-chalk-teal hover:underline transition-colors block cursor-pointer"
                              >
                                {student.name}
                              </Link>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Roll: {student.rollNo || "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Batch & Grade */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-[11px]">
                            {student.batchName || "Unassigned"}
                          </span>
                          {student.grade && (
                            <p className="text-[11px] text-slate-400 mt-1">{student.grade}</p>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-mono text-slate-800 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              +91 {student.phone}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              Parent: {student.parentName || "Guardian"} ({student.parentPhone || "N/A"})
                            </p>
                          </div>
                        </td>

                        {/* Attendance */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {attendancePct !== null ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold text-[11px] ${
                                  attendancePct >= 75
                                    ? "text-emerald-700"
                                    : attendancePct >= 50
                                    ? "text-amber-700"
                                    : "text-red-600"
                                }`}
                              >
                                {attendancePct}%
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({student.presentDays}/{student.totalDays} days)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No records yet</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {student.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Suspended
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              href={`/students/${student.id}`}
                              variant="outline"
                              size="sm"
                              icon={<ChevronRight className="w-3.5 h-3.5" />}
                              iconPosition="right"
                            >
                              View Details
                            </Button>

                            <button
                              onClick={() => handleToggleSuspend(student)}
                              title={student.isActive ? "Suspend Student" : "Activate Student"}
                              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-colors cursor-pointer"
                            >
                              {student.isActive ? (
                                <Ban className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteStudent(student)}
                              title="Delete Student"
                              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* ─── Slide-over Drawer: New Student Admission ─── */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="New Student Admission"
        description="Fill in the student credentials and batch allocation."
        width="md"
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-student-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Admitting Student...</span>
                </>
              ) : (
                <span>Complete Admission</span>
              )}
            </button>
          </>
        }
      >
        <form id="add-student-form" onSubmit={handleAddStudent} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Student Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aman Sharma"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all"
              required
            />
          </div>

          {/* Student Phone */}
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
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                className="w-full pl-11 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* Parent Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Parent Name
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
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
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="w-full pl-11 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Custom Select for Batch */}
          <div>
            <CustomSelect
              label="Assigned Batch *"
              options={batchSelectOptions}
              value={batchId}
              onChange={(val) => {
                setBatchId(val);
                if (val) {
                  const b = batches.find((item) => String(item.id) === String(val));
                  if (b && b.grade) {
                    setGrade(b.grade);
                  }
                }
              }}
              placeholder="Select Batch..."
              searchable
            />
          </div>

          {/* Custom Select for Grade */}
          <div>
            <CustomSelect
              label="Class / Grade Level"
              options={GRADE_OPTIONS}
              value={grade}
              onChange={(val) => setGrade(val)}
              placeholder="Select Class/Grade..."
            />
          </div>

          {/* Roll Number with Auto-generate Toggle & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Roll Number
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRollNo}
                    onChange={(e) => {
                      setAutoRollNo(e.target.checked);
                      if (e.target.checked) setRollNo("");
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-ink-green focus:ring-ink-green/20"
                  />
                  <span className="text-[11px] text-slate-500 font-medium">Auto-generate</span>
                </label>
              </div>
              {autoRollNo ? (
                <div className="px-3.5 py-2.5 text-xs bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-800 font-mono flex items-center justify-between">
                  <span className="font-semibold text-[11px]">Auto-generated</span>
                  <span className="text-[10px] text-emerald-600 font-sans">e.g. G-302</span>
                </div>
              ) : (
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. 101 or G-302"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                  autoFocus
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Student App Password *
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. student123"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                required
              />
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
                  value={courseFee}
                  onChange={(e) => setCourseFee(e.target.value)}
                  placeholder="e.g. 21000"
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </form>
      </Drawer>

      {/* ─── Slide-over Drawer: Import Students ─── */}
      <Drawer
        isOpen={isImportDrawerOpen}
        onClose={handleCloseImportDrawer}
        title="Import Students"
        description="Bulk-admit students from a spreadsheet instead of one at a time."
        width="md"
        footer={
          importResult ? (
            <button
              type="button"
              onClick={handleCloseImportDrawer}
              className="px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCloseImportDrawer}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportStudents}
                disabled={!importFile || importing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Import Students</span>
                )}
              </button>
            </>
          )
        }
      >
        {importResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-2xl font-bold font-display text-emerald-700">
                  {importResult.successCount}
                </p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  Imported Successfully
                </p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <p className="text-2xl font-bold font-display text-red-700">
                  {importResult.failureCount}
                </p>
                <p className="text-[11px] font-semibold text-red-700 mt-0.5">Failed Rows</p>
              </div>
            </div>

            {importResult.failures.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Failure Details
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {importResult.failures.map((f, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-red-50/60 border border-red-100 text-xs"
                    >
                      <span className="font-semibold text-red-800">
                        Row {f.row} — {f.fullName || "Unnamed"}:
                      </span>{" "}
                      <span className="text-red-700">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {importError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Step 1 — Download the template</p>
              <p className="text-[11px] text-slate-500">
                Fill in Full Name, Phone, Password, Parent Name, Parent Phone, Grade, Roll No, and
                Batch Name (must exactly match an existing batch).
              </p>
              <button
                type="button"
                onClick={handleDownloadSample}
                disabled={downloadingSample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {downloadingSample ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-chalk-teal" />
                )}
                <span>Download Sample .xlsx</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Step 2 — Choose your file</p>
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-chalk-teal/50 transition-colors cursor-pointer text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <FileSpreadsheet className="w-7 h-7 text-chalk-teal" />
                {importFile ? (
                  <span className="text-xs font-semibold text-slate-800">{importFile.name}</span>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-slate-700">
                      Click to choose a file
                    </span>
                    <span className="text-[10px] text-slate-400">.xlsx, .xls, or .csv — up to 1000 rows</span>
                  </>
                )}
              </label>
            </div>
          </div>
        )}
      </Drawer>

      {/* ─── Reusable Confirm Modal ─── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />
    </DashboardLayout>
  );
}

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading student directory...</p>
          </div>
        </DashboardLayout>
      }
    >
      <StudentsContent />
    </Suspense>
  );
}
