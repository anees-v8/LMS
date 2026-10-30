"use client";

import React, { useEffect, useCallback } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
}

const VARIANT_CONFIGS = {
  danger: {
    icon: AlertTriangle,
    iconBg: "bg-red-50 text-red-600 border border-red-100",
    buttonBg: "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20",
  },
  warning: {
    icon: AlertCircle,
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
    buttonBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
  },
  info: {
    icon: HelpCircle,
    iconBg: "bg-chalk-teal/10 text-chalk-teal border border-chalk-teal/15",
    buttonBg: "bg-ink-green hover:bg-[#283d34] text-white shadow-ink-green/20",
  },
  success: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
}: ConfirmModalProps) {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.warning;
  const IconComponent = config.icon;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    },
    [isOpen, isLoading, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={isLoading ? undefined : onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl border border-slate-200 animate-slide-up transition-all"
          role="dialog"
          aria-modal="true"
        >
          {/* Close X */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs",
                config.iconBg
              )}
            >
              <IconComponent className="w-6 h-6" />
            </div>

            <div className="flex-1 pr-4">
              <h3 className="text-base font-bold font-display text-slate-900 tracking-tight">
                {title}
              </h3>
              <div className="mt-1.5 text-xs text-slate-600 font-body leading-relaxed">
                {message}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                config.buttonBg
              )}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

