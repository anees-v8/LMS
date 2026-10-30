"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/utils/cn";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface CustomMonthPickerProps {
  month: number; // 1 - 12
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
}

export default function CustomMonthPicker({
  month,
  year,
  onChange,
  className,
}: CustomMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(year);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayYear(year);
  }, [year]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 transition-all cursor-pointer outline-none",
          isOpen && "border-ink-green ring-2 ring-ink-green/10"
        )}
      >
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          {FULL_MONTHS[month - 1]} {year}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform shrink-0",
            isOpen && "rotate-180 text-ink-green"
          )}
        />
      </button>

      {/* Floating Popover Calendar Grid */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 animate-fade-in">
          {/* Year Navigator */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setDisplayYear((prev) => prev - 1)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold font-display text-slate-900">
              {displayYear}
            </span>
            <button
              type="button"
              onClick={() => setDisplayYear((prev) => prev + 1)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Months 3x4 Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, idx) => {
              const mIndex = idx + 1;
              const isSelected = month === mIndex && year === displayYear;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(mIndex, displayYear);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "py-2 text-xs font-medium rounded-xl transition-all text-center cursor-pointer",
                    isSelected
                      ? "bg-ink-green text-white font-bold shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

