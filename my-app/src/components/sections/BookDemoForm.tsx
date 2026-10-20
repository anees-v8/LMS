"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { submitBooking } from "@/libs/api/booking";

const STUDENT_COUNT_RANGES = [
  { label: "1 - 50", value: 25 },
  { label: "51 - 100", value: 75 },
  { label: "101 - 500", value: 300 },
  { label: "500+", value: 500 },
];

export default function BookDemoForm() {
  const [instituteName, setInstituteName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      await submitBooking({
        instituteName,
        ownerName,
        phone,
        email: email || undefined,
        studentCount: studentCount ? Number(studentCount) : undefined,
      });
      setStatus("success");
      setErrorMessage("");
      setInstituteName("");
      setOwnerName("");
      setPhone("");
      setEmail("");
      setStudentCount("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-3">
        <CheckCircle className="w-12 h-12 text-chalk-teal" />
        <p className="text-base font-body font-semibold text-ink-green">
          Thanks! Our team will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
          Institute Name
        </label>
        <input
          type="text"
          placeholder="e.g. Apex Academy"
          value={instituteName}
          onChange={(e) => setInstituteName(e.target.value)}
          required
          minLength={2}
          maxLength={150}
          className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green placeholder:text-ink-green/30 focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green placeholder:text-ink-green/30 focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            placeholder="e.g. 98200 12345"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
            pattern="\d{10,15}"
            title="Phone must be 10-15 digits"
            className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green placeholder:text-ink-green/30 focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green placeholder:text-ink-green/30 focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
          Number of Students
        </label>
        <select
          value={studentCount}
          onChange={(e) => setStudentCount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors"
        >
          <option value="">Select range</option>
          {STUDENT_COUNT_RANGES.map((range) => (
            <option key={range.label} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      {status === "error" && (
        <p className="text-sm font-body text-red-500">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-brass-gold text-white px-6 py-3 rounded-lg font-body font-semibold hover:bg-brass-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? (
          <>
            Booking...
            <Loader2 className="w-4 h-4 animate-spin" />
          </>
        ) : (
          <>
            Book a Free Demo
            <span>→</span>
          </>
        )}
      </button>
    </form>
  );
}
