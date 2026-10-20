"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import { submitBooking } from "@/libs/api/booking";

export default function DemoBookingForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const composedMessage = [
      preferredTime ? `Preferred date/time: ${preferredTime}` : null,
      message || null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await submitBooking({
        instituteName,
        ownerName: fullName,
        phone,
        email: email || undefined,
        city: city || undefined,
        message: composedMessage || undefined,
      });
      setStatus("success");
      setErrorMessage("");
      setFullName("");
      setEmail("");
      setPhone("");
      setCity("");
      setInstituteName("");
      setPreferredTime("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-3">
        <CheckCircle className="w-14 h-14 text-chalk-teal" />
        <p className="text-lg font-body font-semibold text-ink-green">
          Thanks! Our team will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        <div className="space-y-2">
          <label className="text-xs font-body font-semibold text-ink-green">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-body font-semibold text-ink-green">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="e.g. rahul@institute.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-body font-semibold text-ink-green">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            placeholder="e.g. 98200 12345"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
            pattern="\d{10,15}"
            title="Phone must be 10-15 digits"
            className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-body font-semibold text-ink-green">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Mumbai, Maharashtra"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            maxLength={80}
            className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-body font-semibold text-ink-green">
            Institute Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Sharma Coaching Classes"
            value={instituteName}
            onChange={(e) => setInstituteName(e.target.value)}
            required
            minLength={2}
            maxLength={150}
            className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-body font-semibold text-ink-green">
            Preferred Date & Time
          </label>
          <input
            type="datetime-local"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all text-ink-green/70"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-body font-semibold text-ink-green">
          Tell us about your institute (optional)
        </label>
        <textarea
          placeholder="e.g. We have 200+ students and are currently facing challenges with fee collection and attendance tracking. Looking for a solution to automate these tasks."
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          className="w-full px-4 py-3 rounded-xl border border-ink-green/10 bg-paper/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brass-gold/50 text-sm font-body transition-all resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-sm font-body text-red-500">{errorMessage}</p>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full justify-center"
          withArrow={status !== "submitting"}
          disabled={status === "submitting"}
        >
          {status === "submitting" ? (
            <>
              Booking...
              <Loader2 className="w-4 h-4 animate-spin" />
            </>
          ) : (
            "Book My Free Demo"
          )}
        </Button>
        <div className="mt-4 flex items-center justify-center gap-2 text-ink-green/50">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-body">
            Your information is safe with us. We never share your data.
          </span>
        </div>
      </div>
    </form>
  );
}
