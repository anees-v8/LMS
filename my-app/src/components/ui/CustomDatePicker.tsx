"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export default function CustomDatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  className,
  error,
  disabled = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const m = (viewMonth + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setIsOpen(false);
  };

  const formatDisplay = (val?: string) => {
    if (!val) return "";
    const [y, m, d] = val.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfWeek(viewYear, viewMonth);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Input button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white text-slate-900 text-xs font-medium rounded-xl border transition-all text-left outline-none cursor-pointer",
          error
            ? "border-red-300 ring-2 ring-red-50"
            : isOpen
            ? "border-ink-green ring-2 ring-ink-green/10"
            : "border-slate-200/90 hover:border-slate-300",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50"
        )}
      >
        <span className={cn("truncate", !value && "text-slate-400")}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const formattedDate = `${viewYear}-${(viewMonth + 1)
                .toString()
                .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
              const isSelected = value === formattedDate;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-lg transition-all font-medium cursor-pointer",
                    isSelected
                      ? "bg-ink-green text-white font-bold shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

