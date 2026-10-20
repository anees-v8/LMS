import React from "react";
import Link from "next/link";
import { Sparkles, Phone, ArrowRight } from "lucide-react";

export default function Topbar() {
  return (
    <div className="bg-ink-green text-white text-xs font-body border-b border-white/10">
      <div className="container-main flex items-center justify-between py-2">
        <p className="hidden sm:flex items-center gap-1.5 text-white/80 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-brass-gold shrink-0" />
          <span>Mobile-First Operating System for Coaching Institutes</span>
        </p>
        <div className="flex items-center gap-4 ml-auto sm:ml-0 font-medium">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1 text-brass-gold hover:text-brass-gold/90 transition-colors"
          >
            <span>Book Free 1-on-1 Demo</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-white/20 hidden md:inline">|</span>
          <a
            href="tel:+918080161421"
            className="hidden md:inline-flex items-center gap-1.5 text-white/80 hover:text-brass-gold transition-colors"
          >
            <Phone className="w-3 h-3 text-brass-gold" />
            <span>Call Us: +91 80801 61421</span>
          </a>
        </div>
      </div>
    </div>
  );
}
