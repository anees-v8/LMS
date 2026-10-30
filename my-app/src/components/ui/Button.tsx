"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { ArrowRight, Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "teal"
  | "outline"
  | "gold"
  | "ghost"
  | "danger"
  | "tertiary"
  | "text";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1F2E27] text-white hover:bg-[#283d34] shadow-xs active:scale-[0.98] border border-transparent",
  secondary:
    "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 shadow-2xs active:scale-[0.98]",
  teal:
    "bg-chalk-teal text-white hover:bg-[#245245] shadow-xs active:scale-[0.98] border border-transparent",
  outline:
    "bg-white text-chalk-teal border border-chalk-teal/30 hover:bg-chalk-teal/5 active:scale-[0.98]",
  gold:
    "bg-brass-gold text-white hover:bg-brass-gold/90 shadow-xs active:scale-[0.98] border border-transparent",
  ghost:
    "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent",
  danger:
    "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:scale-[0.98]",
  tertiary:
    "bg-chalk-teal text-white hover:bg-chalk-teal/90 shadow-md hover:shadow-lg",
  text: "bg-transparent text-chalk-teal hover:text-brass-gold p-0",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-[11px] rounded-lg font-medium",
  sm: "px-3 py-1.5 text-xs rounded-xl font-semibold",
  md: "px-4 py-2 text-xs rounded-xl font-semibold",
  lg: "px-5 py-2.5 text-sm rounded-xl font-semibold",
};

export default function Button({
  variant = "primary",
  size = "md",
  withArrow = false,
  href,
  target,
  rel,
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex flex-nowrap items-center justify-center gap-1.5 font-body transition-all duration-150 cursor-pointer whitespace-nowrap select-none shrink-0",
    variant !== "text" && sizeStyles[size],
    variantStyles[variant],
    fullWidth && "w-full",
    (disabled || loading) && "opacity-60 cursor-not-allowed pointer-events-none",
    className
  );

  const content = (
    <>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        icon && iconPosition === "left" && <span className="shrink-0 flex items-center">{icon}</span>
      )}
      <span className="whitespace-nowrap inline-flex items-center gap-1">{children}</span>
      {!loading && icon && iconPosition === "right" && (
        <span className="shrink-0 flex items-center">{icon}</span>
      )}
      {!loading && withArrow && (
        <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? (rel || "noopener noreferrer") : rel}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
