"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Megaphone,
  Send,
  Users,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Smartphone,
  ChevronRight,
  Filter,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/useAuthStore";

interface Batch {
  id: number;
  name: string;
}

interface NotificationItem {
  id: number;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

export default function NotificationsPage() {
  const { tenant } = useAuthStore();
  const instituteName = tenant?.name || "CampusWeb Academy";

  // Tab: 'compose' | 'history'
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Compose State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [targetRole, setTargetRole] = useState<"student" | "teacher" | "all">("student");
  const [targetBatchId, setTargetBatchId] = useState<string>("all");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // History State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "unread">("all");

  // Load batches for target selection
  useEffect(() => {
    apiClient
      .get<Batch[]>("/admin/batches")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.batches || [];
        setBatches(list);
      })
      .catch((err) => console.error("Failed to load batches", err));
  }, []);

  // Load notification history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.get<NotificationItem[]>("/admin/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load notification history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // Submit broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || sendingBroadcast) return;

    setSendingBroadcast(true);
    setBroadcastSuccess(false);
    setBroadcastError(null);

    try {
      await apiClient.post("/admin/notifications/broadcast", {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim() || undefined,
        targetRole: targetRole === "all" ? "student" : targetRole,
        batchId: targetBatchId !== "all" ? Number(targetBatchId) : undefined,
      });

      setBroadcastSuccess(true);
      setBroadcastTitle("");
      setBroadcastBody("");
      setTimeout(() => setBroadcastSuccess(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch broadcast";
      setBroadcastError(msg);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const displayedNotifications =
    historyFilter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-chalk-teal/10 text-chalk-teal border border-chalk-teal/20">
              Communication Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Announcements & Broadcasts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliver instant mobile push announcements to students, parents, and teachers.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab("compose")}
            className={`pb-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "compose"
                ? "border-ink-green text-ink-green font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Compose Announcement</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "history"
                ? "border-ink-green text-ink-green font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Delivery Logs & History ({notifications.length})</span>
          </button>
        </div>

        {/* ════════════════ TAB 1: COMPOSE BROADCAST ════════════════ */}
        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  New Announcement Broadcast
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sends an immediate push notification to the Campus mobile application.
                </p>
              </div>

              {broadcastSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Announcement dispatched successfully to all target recipients!</span>
                </div>
              )}

              {broadcastError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{broadcastError}</span>
                </div>
              )}

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                {/* Target Audience Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Target Audience
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink-green/20 focus:border-ink-green transition-all text-slate-900 cursor-pointer"
                    >
                      <option value="student">Students & Parents</option>
                      <option value="teacher">Faculty & Teachers</option>
                      <option value="all">Everyone in Institute</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Batch Filter
                    </label>
                    <select
                      value={targetBatchId}
                      onChange={(e) => setTargetBatchId(e.target.value)}
                      disabled={targetRole === "teacher"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink-green/20 focus:border-ink-green transition-all text-slate-900 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="all">All Batches</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Announcement Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Announcement Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Special Physics Revision Class Tomorrow at 9:00 AM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink-green/20 focus:border-ink-green transition-all text-slate-900"
                  />
                </div>

                {/* Announcement Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Detailed Message Body
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {broadcastBody.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Provide full details, room number, syllabus covered, or instructions for students..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink-green/20 focus:border-ink-green transition-all text-slate-900 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingBroadcast || !broadcastTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold shadow-md shadow-ink-green/20 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {sendingBroadcast ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Dispatch Mobile Broadcast</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Live Mobile Device Mockup Preview */}
            <div className="lg:col-span-5 bg-slate-100/70 rounded-2xl p-6 sm:p-8 border border-slate-200/80 flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Live Recipient Lockscreen Preview</span>
              </p>

              {/* iPhone Mockup Frame */}
              <div className="w-[280px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800">
                {/* Notch */}
                <div className="w-24 h-4 bg-black rounded-full mx-auto mb-4" />

                {/* Lockscreen Time */}
                <div className="text-center text-white my-3">
                  <span className="text-3xl font-extralight tracking-tight font-display">
                    09:41
                  </span>
                  <p className="text-[10px] text-white/60">Saturday, October 31</p>
                </div>

                {/* Notification Banner on Phone */}
                <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg my-6 text-slate-900 border border-white/40 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-md bg-ink-green flex items-center justify-center text-white text-[8px] font-bold">
                        CW
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 tracking-tight">
                        {instituteName}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">now</span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {broadcastTitle.trim() || "Announcement Headline Here..."}
                  </p>

                  <p className="text-[10px] text-slate-600 mt-1 leading-relaxed line-clamp-3">
                    {broadcastBody.trim() ||
                      "Details typed in the form will appear live on student mobile screens."}
                  </p>
                </div>

                {/* Home Indicator */}
                <div className="w-24 h-1 bg-white/40 rounded-full mx-auto mt-8 mb-1" />
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ TAB 2: NOTIFICATION HISTORY ════════════════ */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  Notification Delivery Logs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent broadcasts and automated fee/attendance reminders.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    historyFilter === "all"
                      ? "bg-ink-green text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setHistoryFilter("unread")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    historyFilter === "unread"
                      ? "bg-ink-green text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Unread ({notifications.filter((n) => !n.is_read).length})
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-ink-green mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading history...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No notifications found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Announcements sent from the Compose tab will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedNotifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                      item.is_read
                        ? "bg-white border-slate-200"
                        : "bg-emerald-50/40 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center shrink-0 mt-0.5">
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        {item.body && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.body}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(item.created_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.is_read
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.is_read ? "Read" : "Delivered"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

