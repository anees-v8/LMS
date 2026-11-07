"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { apiClient } from "@/lib/api/client";

interface Subject {
  id: number;
  name: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add/Edit drawer — null means "add new", otherwise editing this subject
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/subjects");
      const list = Array.isArray(res.data) ? res.data : res.data?.subjects || [];
      setSubjects(list);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openAddDrawer = () => {
    setEditingSubject(null);
    setNameInput("");
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (subject: Subject) => {
    setEditingSubject(subject);
    setNameInput(subject.name);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = nameInput.trim();
    if (!name) {
      setFormError("Subject name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSubject) {
        await apiClient.put(`/admin/subjects/${editingSubject.id}`, { name });
        setToast(`"${name}" updated successfully.`);
      } else {
        await apiClient.post("/admin/subjects", { name });
        setToast(`"${name}" added successfully.`);
      }
      setIsDrawerOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error?.message || err?.message || "Failed to save subject."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/admin/subjects/${deletingSubject.id}`);
      const softDeleted = res.data?.softDeleted;
      setToast(
        softDeleted
          ? `"${deletingSubject.name}" archived — it still has content, tests, or a schedule attached.`
          : `"${deletingSubject.name}" deleted successfully.`
      );
      setDeletingSubject(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to delete subject.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-ink-green tracking-tight">
              Subjects
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage the subject tags used when creating batches and curriculum chapters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Refresh Subjects"
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={openAddDrawer}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{toast}</span>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-ink-green mb-2" />
              <p className="text-xs font-semibold text-slate-500">Loading subjects...</p>
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
          ) : subjects.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No subjects created yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Add your institute&apos;s first subject to start building batches and curricula.
              </p>
              <button
                onClick={openAddDrawer}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-green text-white text-xs font-semibold rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-chalk-teal/15 text-chalk-teal font-bold text-xs flex items-center justify-center shrink-0">
                      <BookMarked className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-slate-900 text-sm">{subject.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditDrawer(subject)}
                      title="Rename Subject"
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-chalk-teal hover:bg-chalk-teal/10 hover:border-chalk-teal/30 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingSubject(subject)}
                      title="Delete Subject"
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingSubject ? "Rename Subject" : "Add New Subject"}
        description={
          editingSubject
            ? "Update this subject's name across the institute."
            : "Create a new subject tag to use in batches and curricula."
        }
        width="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="subject-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingSubject ? "Save Changes" : "Add Subject"}</span>
              )}
            </button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject Name *
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Physics"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-ink-green focus:bg-white text-slate-900 transition-all"
              autoFocus
              required
            />
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleConfirmDelete}
        title="Delete This Subject?"
        message={
          <span>
            Are you sure you want to delete{" "}
            <strong className="text-slate-900 font-semibold">{deletingSubject?.name}</strong>?
            This cannot be undone. If it&apos;s already used by a batch, test, or schedule, it
            will be archived instead of deleted so existing records stay intact.
          </span>
        }
        confirmText="Yes, Delete Subject"
        variant="danger"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
}
