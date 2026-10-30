"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Building2,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Bell,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
  Camera,
  Upload,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CustomSelect, { Option } from "@/components/ui/CustomSelect";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/utils/cn";

interface PaymentSettings {
  keyId: string;
  configured: boolean;
  secretPlaceholder?: string;
}

interface Batch {
  id: number;
  name: string;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { user, tenant, fetchMe } = useAuthStore();

  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"payment" | "profile" | "broadcast">(
    initialTab === "profile" || initialTab === "broadcast" || initialTab === "payment"
      ? (initialTab as any)
      : "payment"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "broadcast" || tab === "payment") {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Broadcast Notification State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [targetRole, setTargetRole] = useState<string>("student");
  const [targetBatchId, setTargetBatchId] = useState<string>("all");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Logo / Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Load payment settings
  const fetchPaymentSettings = useCallback(async () => {
    try {
      setLoadingPayment(true);
      setPaymentError(null);
      const res = await apiClient.get<PaymentSettings>("/admin/settings/payment");
      setPaymentSettings(res.data);
      setKeyId(res.data.keyId || "");
    } catch (err: any) {
      console.error("Failed to load payment settings", err);
      setPaymentError(err?.response?.data?.error?.message || "Failed to load payment credentials");
    } finally {
      setLoadingPayment(false);
    }
  }, []);

  // Load batches for broadcast target
  useEffect(() => {
    apiClient
      .get<Batch[]>("/admin/batches")
      .then((res) => setBatches(res.data || []))
      .catch((err) => console.error("Failed to fetch batches", err));
  }, []);

  useEffect(() => {
    fetchPaymentSettings();
  }, [fetchPaymentSettings]);

  // Save payment credentials
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    setPaymentSuccess(false);
    setPaymentError(null);

    try {
      if (!keyId.trim()) {
        throw new Error("Key ID is required");
      }
      if (!paymentSettings?.configured && !secret.trim()) {
        throw new Error("Key Secret is required for initial configuration");
      }

      await apiClient.put("/admin/settings/payment", {
        keyId: keyId.trim(),
        secret: secret.trim() || undefined,
      });

      setPaymentSuccess(true);
      setSecret("");
      await fetchPaymentSettings();
      setTimeout(() => setPaymentSuccess(false), 4000);
    } catch (err: any) {
      setPaymentError(
        err?.response?.data?.error?.message || err?.message || "Failed to update Razorpay credentials"
      );
    } finally {
      setSavingPayment(false);
    }
  };

  // Broadcast push notification
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim()) return;

    setSendingBroadcast(true);
    setBroadcastSuccess(false);
    setBroadcastError(null);

    try {
      await apiClient.post("/admin/notifications/broadcast", {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim() || undefined,
        targetRole: targetRole as "student" | "teacher",
        batchId: targetBatchId !== "all" ? Number(targetBatchId) : undefined,
      });

      setBroadcastSuccess(true);
      setBroadcastTitle("");
      setBroadcastBody("");
      setTimeout(() => setBroadcastSuccess(false), 4000);
    } catch (err: any) {
      setBroadcastError(
        err?.response?.data?.error?.message || "Failed to broadcast notification"
      );
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Upload Institute Logo / Admin Photo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Image size must be under 5MB");
      return;
    }

    setUploadingLogo(true);
    setLogoError(null);
    setLogoSuccess(null);

    try {
      const sigRes = await apiClient.get<{
        cloudName: string;
        apiKey: string;
        timestamp: number;
        signature: string;
        folder: string;
      }>("/auth/upload-signature");

      const { cloudName, apiKey, timestamp, signature, folder } = sigRes.data;

      if (!cloudName || !apiKey) {
        throw new Error("Cloud storage is not configured on the server.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", String(apiKey));
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData?.error?.message || "Failed to upload image file");
      }

      const secureUrl = uploadData.secure_url;
      await apiClient.patch("/auth/avatar", { avatarUrl: secureUrl });
      await fetchMe();

      setLogoSuccess("Institute logo updated successfully!");
      setTimeout(() => setLogoSuccess(null), 4000);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      setLogoError(
        err?.response?.data?.error?.message || err?.message || "Failed to upload photo"
      );
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove Photo
  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove your institute photo?")) return;
    setUploadingLogo(true);
    setLogoError(null);
    try {
      await apiClient.patch("/auth/avatar", { avatarUrl: null });
      await fetchMe();
      setLogoSuccess("Photo removed successfully.");
      setTimeout(() => setLogoSuccess(null), 3000);
    } catch (err: any) {
      setLogoError(err?.response?.data?.error?.message || "Failed to remove photo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const targetRoleOptions: Option[] = [
    { label: "All Students", value: "student" },
    { label: "Teachers", value: "teacher" },
  ];

  const batchFilterOptions: Option[] = [
    { label: "All Enrolled Batches", value: "all" },
    ...batches.map((b) => ({ label: b.name, value: String(b.id) })),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Settings &amp; Configurations
          </h1>
          <p className="text-xs text-slate-500 font-body mt-1">
            Manage your institute identity, payment gateway credentials, and broadcast alerts.
          </p>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("payment")}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "payment"
                ? "border-chalk-teal text-chalk-teal font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment Gateway (BYOG)</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "profile"
                ? "border-chalk-teal text-chalk-teal font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Institute Profile &amp; Logo</span>
          </button>

          <button
            onClick={() => setActiveTab("broadcast")}
            className={cn(
              "pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap",
              activeTab === "broadcast"
                ? "border-chalk-teal text-chalk-teal font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Bell className="w-4 h-4" />
            <span>Broadcast Notice</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB 1: PAYMENT GATEWAY (RAZORPAY BYOG)
            ════════════════════════════════════════════════════════════ */}
        {activeTab === "payment" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 text-chalk-teal flex items-center justify-center">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold font-display text-slate-900">
                        Razorpay Gateway (Direct Payout)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Student online fee payments settle directly into your institute bank account.
                      </p>
                    </div>
                  </div>
                  {paymentSettings?.configured && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Active &amp; Connected
                    </span>
                  )}
                </div>

                <form onSubmit={handleSavePayment} className="space-y-4 mt-5">
                  {paymentSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Razorpay API credentials updated successfully!</span>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Razorpay Key ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      placeholder="rzp_live_xxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Razorpay Key Secret *
                      </label>
                      {paymentSettings?.configured && (
                        <span className="text-[10px] text-slate-400">
                          Leave blank to keep existing secret
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder={
                          paymentSettings?.configured
                            ? "••••••••••••••••••••••••••••"
                            : "Enter your Razorpay Key Secret"
                        }
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={savingPayment}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-green hover:bg-[#283d34] text-white text-xs font-semibold shadow-md shadow-ink-green/20 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {savingPayment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Razorpay Credentials</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs space-y-3 font-body">
                <div className="flex items-center gap-2 text-slate-900 font-bold font-display">
                  <Shield className="w-4 h-4 text-chalk-teal" />
                  <span>Zero-Commission Setup</span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  CampusWeb does not hold your student funds. Fees are paid via Razorpay and deposited straight into your bank account according to standard T+1 / T+2 settlement cycles.
                </p>
                <div className="pt-3 border-t border-slate-100">
                  <a
                    href="https://dashboard.razorpay.com/#/access/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-chalk-teal hover:underline font-semibold"
                  >
                    <span>Get API Keys from Razorpay</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2: INSTITUTE PROFILE & LOGO UPLOAD
            ════════════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            {/* Logo & Photo Upload Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
              {/* Avatar Box with Camera Overlay */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-2xl font-display overflow-hidden border-2 border-slate-200/80 shadow-xs">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={tenant?.name || "Institute Logo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{tenant?.name?.[0] || user?.fullName?.[0] || "G"}</span>
                  )}

                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[10px] gap-1 z-10">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Camera Click Icon */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Institute Logo / Admin Photo"
                  className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-ink-green hover:bg-chalk-teal text-white shadow-md transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Title & Actions */}
              <div className="space-y-2 flex-1">
                <div>
                  <h2 className="text-base font-bold font-display text-slate-900">
                    {tenant?.name || "Institute Profile"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tenant Slug: <span className="font-mono text-slate-600">{tenant?.slug || "general"}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-chalk-teal/10 hover:bg-chalk-teal hover:text-white text-chalk-teal text-xs font-semibold border border-chalk-teal/20 transition-all cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo / Photo</span>
                  </button>

                  {user?.avatarUrl && (
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 font-body">
                  Supports JPG, PNG or WebP up to 5MB. Appears in mobile app, student portal, and payment receipts.
                </p>
              </div>
            </div>

            {/* Notification messages */}
            {logoSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{logoSuccess}</span>
              </div>
            )}
            {logoError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            {/* Identity Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-body">
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Primary Admin User
                </span>
                <div className="font-bold text-slate-900 text-sm">{user?.fullName || "Admin"}</div>
                <div className="text-slate-500 mt-0.5 font-mono">{user?.phone ? `+91 ${user.phone}` : "—"}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Registered Email
                </span>
                <div className="font-bold text-slate-900 text-sm truncate">{user?.email || "No email linked"}</div>
                <div className="text-slate-500 mt-0.5">Used for billing notices and receipts</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Account Role
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-chalk-teal/10 text-chalk-teal border border-chalk-teal/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Coaching Admin</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Student Portal Access
                </span>
                <div className="font-mono text-[11px] text-slate-700 truncate">
                  campusweb.co.in/{tenant?.slug || ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 3: BROADCAST NOTIFICATION
            ════════════════════════════════════════════════════════════ */}
        {activeTab === "broadcast" && (
          <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-brass-gold" />
                <span>Broadcast Push Notification</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Send an instant announcement notification directly to all student or teacher mobile devices.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {broadcastSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Notification broadcast dispatched successfully!</span>
                </div>
              )}

              {broadcastError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{broadcastError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Audience *
                  </label>
                  <CustomSelect
                    options={targetRoleOptions}
                    value={targetRole}
                    onChange={(val) => setTargetRole(val as string)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Filter by Batch
                  </label>
                  <CustomSelect
                    options={batchFilterOptions}
                    value={targetBatchId}
                    onChange={(val) => setTargetBatchId(val as string)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Special Physics Revision Class Tomorrow at 9:00 AM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Type the message body to be delivered to students' mobile app..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-chalk-teal/20 focus:border-chalk-teal transition-all text-slate-900 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
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
                  <span>Send Broadcast Notification</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-12 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-chalk-teal mb-2" />
            Loading Settings...
          </div>
        </DashboardLayout>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
