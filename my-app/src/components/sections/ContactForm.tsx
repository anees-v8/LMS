"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { submitBooking } from "@/libs/api/booking";

export default function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      await submitBooking({
        instituteName,
        ownerName: fullName,
        phone,
        email: email || undefined,
        message: message || undefined,
      });
      setStatus("success");
      setErrorMessage("");
      setFullName("");
      setInstituteName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center py-8 px-4 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-display font-bold text-ink-green">
          Message Received!
        </h3>
        <p className="text-sm font-body text-ink-green/75 max-w-sm leading-relaxed">
          Thank you for reaching out. An onboarding specialist will review your inquiry and connect with you shortly via phone or WhatsApp.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-chalk-teal bg-chalk-teal/10 hover:bg-chalk-teal/20 transition-colors"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            placeholder="e.g. Rajesh Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
      <div>
        <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          placeholder="director@institute.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green placeholder:text-ink-green/30 focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-body font-medium text-ink-green mb-1.5">
          Message
        </label>
        <textarea
          rows={4}
          placeholder="How can we help you?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          className="w-full px-4 py-2.5 rounded-lg border border-paper bg-paper/50 text-sm font-body text-ink-green placeholder:text-ink-green/30 focus:outline-none focus:border-chalk-teal focus:ring-1 focus:ring-chalk-teal/20 transition-colors resize-none"
        />
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
            Sending...
            <Loader2 className="w-4 h-4 animate-spin" />
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
