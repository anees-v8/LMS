"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Minus } from "lucide-react";
import { cn } from "@/utils/cn";

interface BackendPlan {
  id: number;
  name: string;
  features: string[];
}

// Every gateable feature key, in the order they should appear as rows —
// matches backend/plan.validators.ts's featureKeySchema exactly, so a plan's
// `features` array (from /api/public/plans) can be checked against this list.
const FEATURE_ROWS: { key: string; label: string }[] = [
  { key: "student_management", label: "Student Management & Profiles" },
  { key: "batch_management", label: "Batch & Timetable Scheduling" },
  { key: "digital_attendance", label: "Dynamic QR & 1-Tap Attendance" },
  { key: "fee_management", label: "Automated Fee Tracking & Dues" },
  { key: "online_payments", label: "0% Commission Direct Bank Payments" },
  { key: "whatsapp_reminders", label: "Automated WhatsApp Alerts & Receipts" },
  { key: "live_classes", label: "Live Classes (Google Meet)" },
  { key: "video_library", label: "Lecture Recordings & Notes" },
  { key: "online_tests", label: "Online Tests & Auto-Grading" },
  { key: "doubt_solving", label: "In-App Doubt Solving Forum" },
  { key: "performance_reports", label: "Performance & Attendance Analytics" },
  { key: "teacher_accounts", label: "Dedicated Teacher Mobile Logins" },
  { key: "website_request", label: "Institute Public Web Page Setup" },
];

function CellValue({
  included,
  isWebsite,
}: {
  included: boolean;
  isWebsite?: boolean;
}) {
  if (included) {
    if (isWebsite) {
      return (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brass-gold/15 border border-brass-gold/30 text-brass-gold text-xs font-bold font-body">
            <Check className="w-3.5 h-3.5 text-brass-gold" />
            Yearly Only
          </span>
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-chalk-teal/10 flex items-center justify-center mx-auto">
        <Check className="w-3.5 h-3.5 text-chalk-teal" />
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <Minus className="w-4 h-4 text-ink-green/20" />
    </div>
  );
}

export default function ComparisonTable() {
  const [plans, setPlans] = useState<BackendPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/public/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch (error) {
        console.error("Error fetching pricing plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <section className="section-padding bg-[#F8F9F7]">
        <div className="container-main flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-ink-green opacity-50" />
        </div>
      </section>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  // Tailwind needs statically-analyzable class names (no template-literal
  // class construction), so map the column count explicitly.
  const GRID_COLS_BY_COUNT: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  const gridCols =
    GRID_COLS_BY_COUNT[plans.length + 1] ?? "grid-cols-4";

  return (
    <section className="section-padding bg-[#F8F9F7] border-t border-black/[0.05]">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[700px]">
              {/* Table Header */}
              <div className={cn("grid gap-4 mb-4", gridCols)}>
                <div className="text-lg font-display font-bold text-ink-green">
                  Compare Plans
                </div>
                {plans.map((plan) => {
                  const isPopular = plan.name.toLowerCase() === "pro";
                  return (
                    <div key={plan.id} className="text-center">
                      {isPopular ? (
                        <div className="inline-block">
                          <span className="block text-[10px] bg-brass-gold text-white px-2 py-0.5 rounded-full font-body font-semibold uppercase tracking-wider mb-1">
                            Most Popular
                          </span>
                          <p className="text-base font-display font-semibold text-ink-green">
                            {plan.name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-base font-display font-semibold text-ink-green">
                          {plan.name}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Table Rows */}
              <div className="bg-card-surface rounded-2xl shadow-card overflow-hidden">
                {FEATURE_ROWS.filter((row) =>
                  plans.some((p) => p.features.includes(row.key))
                ).map((row, i, filteredRows) => (
                  <div
                    key={row.key}
                    className={cn(
                      "grid gap-4 px-6 py-4 items-center",
                      gridCols,
                      i !== filteredRows.length - 1 && "border-b border-black/[0.05]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-body text-ink-green">
                        {row.label}
                      </span>
                    </div>
                    {plans.map((plan) => (
                      <div key={plan.id} className="text-center">
                        <CellValue
                          included={plan.features.includes(row.key)}
                          isWebsite={row.key === "website_request"}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
