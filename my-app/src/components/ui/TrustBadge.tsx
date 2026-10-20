"use client";

import React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface TrustBadgeProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className?: string;
}

export default function TrustBadge({
  icon: Icon,
  title,
  subtitle,
  className,
}: TrustBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md hover:border-chalk-teal/30 transition-all",
        className
      )}
    >
      <div className="w-11 h-11 rounded-xl bg-chalk-teal/10 flex items-center justify-center flex-shrink-0 text-chalk-teal">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-display font-bold text-ink-green leading-snug">
          {title}
        </p>
        <p className="text-xs text-ink-green/65 font-body leading-snug mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
