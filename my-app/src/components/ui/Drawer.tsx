"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

const WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: DrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [isClosing, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isClosing, handleClose]);

  // Prevent background scroll when drawer is open
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

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer",
          isClosing ? "animate-fade-out" : "animate-fade-in"
        )}
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10 pointer-events-none">
        <div
          className={cn(
            "w-screen bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 pointer-events-auto h-full",
            isClosing ? "animate-slide-out-right" : "animate-slide-in-right",
            WIDTH_CLASSES[width]
          )}
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 tracking-tight">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {children}
          </div>

          {/* Footer (if provided) */}
          {footer && (
            <div className="p-4 px-5 sm:px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
