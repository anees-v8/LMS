"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/utils/cn";

export interface Option {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: Option[];
  value?: string | number | null;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  searchable = false,
  disabled = false,
  className,
  error,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white text-slate-900 text-xs font-medium rounded-xl border transition-all text-left outline-none cursor-pointer",
          error
            ? "border-red-300 focus:border-red-500 ring-2 ring-red-50"
            : isOpen
            ? "border-ink-green ring-2 ring-ink-green/10"
            : "border-slate-200/90 hover:border-slate-300",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className={cn("truncate", !selectedOption && "text-slate-400")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-ink-green"
          )}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xl py-1 animate-fade-in max-h-64 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-ink-green text-slate-800"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto divide-y divide-slate-50 py-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3.5 py-2 text-xs text-left transition-colors cursor-pointer",
                      isSelected
                        ? "bg-ink-green/5 text-ink-green font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div>
                        <div className="truncate">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-ink-green shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

