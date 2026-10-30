"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  BookOpen,
  X,
  Loader2,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/utils/cn";

interface Teacher {
  id: number;
  fullName: string;
  phone: string;
  email?: string | null;
  status: "active" | "inactive" | "on_leave" | string;
  leaveStart?: string | null;
  leaveEnd?: string | null;
  assignedBatches?: string[];
  assignedSubjects?: string[];
}

interface TimetableItem {
  id: number;
  dayOfWeek: number;
  batch: string;
  subject?: string;
  teacher: string;
  teacherId: number;
}

const STATUS_FILTER_OPTIONS: Option[] = [
  { label: "All Status", value: "all" },
  { label: "Active Teachers", value: "active" },
  { label: "On Leave", value: "on_leave" },
];

function TeachersContent() {
  const searchParams = useSearchParams();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Educator Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("teacher123");

  // Confirm Modal state for Delete
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    teacher: Teacher | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    teacher: null,
    isDeleting: false,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [teachersRes, timetableRes] = await Promise.allSettled([
        apiClient.get<Teacher[]>("/admin/teachers"),
        apiClient.get<TimetableItem[]>("/admin/timetable"),
      ]);

      let teacherList: Teacher[] = [];
      let ttList: TimetableItem[] = [];

      if (teachersRes.status === "fulfilled") {
        teacherList = teachersRes.value.data || [];
      } else {
        throw new Error(
          teachersRes.reason?.response?.data?.error?.message ||
            "Failed to load teachers list"
        );
      }

      if (timetableRes.status === "fulfilled") {
        ttList = timetableRes.value.data || [];
        setTimetable(ttList);
      }

      // Map assigned subjects and batches to each teacher
      const enrichedTeachers = teacherList.map((t) => {
        const matches = ttList.filter(
          (item) => item.teacherId === t.id || item.teacher === t.fullName
        );
        const batches = Array.from(new Set(matches.map((m) => m.batch))).filter(Boolean);
        const subjects = Array.from(new Set(matches.map((m) => m.subject || ""))).filter(Boolean);
        return {
          ...t,
          assignedBatches: batches,
          assignedSubjects: subjects,
        };
      });

      setTeachers(enrichedTeachers);
    } catch (err: any) {
      console.error("Error fetching teachers data:", err);
      setError(err?.response?.data?.error?.message || err?.message || "Failed to load teachers directory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL query ?action=new
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone.includes(searchQuery) ||
        (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ? true : (t.status || "active") === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [teachers, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((t) => (t.status || "active") === "active").length;
    const onLeave = teachers.filter((t) => t.status === "on_leave").length;
    const subjectsCount = new Set(
      teachers.flatMap((t) => t.assignedSubjects || [])
    ).size;
    return { total, active, onLeave, subjectsCount };
  }, [teachers]);

  // Submit Add Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!fullName.trim()) {
      setFormError("Educator full name is required.");
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post("/admin/teachers", {
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
        password: password.trim() || "teacher123",
      });

      setIsDrawerOpen(false);
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("teacher123");
      fetchData();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error?.message ||
          "Failed to create educator account. Please check plan limits."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Teacher
  const confirmDeleteTeacher = async () => {
    if (!deleteModal.teacher) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
      await apiClient.delete(`/admin/teachers/${deleteModal.teacher.id}`);
      setDeleteModal({ isOpen: false, teacher: null, isDeleting: false });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to delete educator");
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Teachers & Staff</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-chalk-teal/10 text-chalk-teal border border-chalk-teal/20">
                {teachers.length} Active Staff
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-body mt-1">
              Manage teacher accounts, mobile app logins, subject assignments, and duty status.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Directory"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-chalk-teal")} />
            </button>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold shadow-md shadow-ink-green/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Teacher</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Teachers</span>
              <GraduationCap className="w-4 h-4 text-chalk-teal" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-slate-900">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered teachers</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active on Duty</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-emerald-700">
              {stats.active}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Taking scheduled batches</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>On Leave</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-amber-700">
              {stats.onLeave}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Temporary absence</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Subjects Covered</span>
              <BookOpen className="w-4 h-4 text-brass-gold" />
            </div>
            <div className="mt-2 text-2xl font-bold font-display text-slate-900">
              {stats.subjectsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all active batches</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teachers by name, phone, or email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-body bg-slate-50 border border-slate-200/70 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-52">
            <CustomSelect
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by Status"
            />
          </div>
        </div>

        {/* Content State: Loading, Error, Empty, List */}
        {loading ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center">
            <Loader2 className="w-8 h-8 text-chalk-teal animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-600 font-medium">Loading teachers roster...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-white border border-red-200 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Unable to load teachers</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 rounded-xl bg-ink-green text-white text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No teachers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No matching educators match your current filter parameters."
                : "No teachers registered yet. Add your first teacher to start assigning batches."}
            </p>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-green text-white text-xs font-semibold shadow-md shadow-ink-green/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Educator</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Mobile & Login</th>
                    <th className="py-3 px-4">Assigned Subjects</th>
                    <th className="py-3 px-4">Active Batches</th>
                    <th className="py-3 px-4">Duty Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-body">
                  {filteredTeachers.map((t) => {
                    const initials = t.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const isOnLeave = t.status === "on_leave";

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Member */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 text-chalk-teal font-bold font-display flex items-center justify-center shrink-0 border border-chalk-teal/15 shadow-2xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-xs font-display">
                                {t.fullName}
                              </div>
                              <div className="text-[11px] text-slate-400">ID #{t.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* Phone & Email */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>+91 {t.phone}</span>
                            </div>
                            {t.email && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate max-w-[180px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{t.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Assigned Subjects */}
                        <td className="py-3.5 px-4">
                          {t.assignedSubjects && t.assignedSubjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {t.assignedSubjects.map((sub, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-medium"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None yet</span>
                          )}
                        </td>

                        {/* Batches */}
                        <td className="py-3.5 px-4">
                          {t.assignedBatches && t.assignedBatches.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {t.assignedBatches.map((b, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isOnLeave ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>On Leave</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              href={`/teachers/${t.id}`}
                              variant="outline"
                              size="sm"
                              icon={<ChevronRight className="w-3.5 h-3.5" />}
                              iconPosition="right"
                            >
                              View Details
                            </Button>

                            <a
                              href={`https://wa.me/91${t.phone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  teacher: t,
                                  isDeleting: false,
                                })
                              }
                              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                              title="Delete Teacher"
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

            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-700">{filteredTeachers.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{teachers.length}</span> teachers
              </div>
            </div>
          </div>
        )}

        {/* Add Educator Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setFormError(null);
          }}
          title="Add New Educator"
          description="Create teacher login credentials for the mobile app."
        >
          <form onSubmit={handleCreateTeacher} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mobile Number (App Login) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Teacher will use this 10-digit number to log in to the CampusWeb Teacher App.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@institute.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Initial Password *
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="teacher123"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Teacher can change their password after signing in.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold shadow-md shadow-ink-green/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create Educator Account</span>
              </button>
            </div>
          </form>
        </Drawer>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, teacher: null, isDeleting: false })}
          onConfirm={confirmDeleteTeacher}
          title="Remove Educator Account?"
          message={
            <span>
              Are you sure you want to permanently remove{" "}
              <strong className="text-slate-900">{deleteModal.teacher?.fullName}</strong>? This
              will revoke their teacher app access and unassign them from scheduled batches.
            </span>
          }
          confirmText="Yes, Delete Account"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteModal.isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}

export default function TeachersPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-chalk-teal mb-2" />
            Loading Teachers Directory...
          </div>
        </DashboardLayout>
      }
    >
      <TeachersContent />
    </Suspense>
  );
}
