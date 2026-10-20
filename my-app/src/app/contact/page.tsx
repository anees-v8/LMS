import type { Metadata } from "next";
import { Phone, Mail, Clock, ArrowRight } from "lucide-react";
import ContactForm from "@/components/sections/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — CampusWeb | Get in Touch with Our Team",
  description:
    "Have questions about CampusWeb? Reach out to our team via phone, email, or our contact form for personalized institute support.",
};

export default function ContactPage() {
  return (
    <section className="bg-white pt-6 pb-16 md:pt-10 md:pb-24">
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Left — Contact Info */}
          <div className="flex flex-col">
            <div>
              <span className="badge-gold mb-3 inline-block">Contact Us</span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-ink-green mt-2 mb-4 leading-tight">
                We&apos;d Love to Hear
                <br />
                <span className="text-gradient-gold">From You.</span>
              </h1>
              <p className="text-base text-ink-green/70 font-body leading-relaxed mb-6 max-w-lg">
                Have questions about pricing, setup, or features? Reach out directly to our team. We assist coaching directors across India with fast, hands-on onboarding.
              </p>

              <div className="space-y-3">
                {[
                  {
                    icon: Phone,
                    label: "Phone Helpline",
                    value: "+91 80801 61421",
                    detail: "Direct support desk for coaching institutes",
                    href: "tel:+918080161421",
                    isExternal: false,
                  },
                  {
                    icon: Mail,
                    label: "Email Support",
                    value: "support@campusweb.co.in",
                    detail: "Replies usually within 2 hours",
                    href: "mailto:support@campusweb.co.in",
                    isExternal: false,
                  },
                  {
                    icon: Clock,
                    label: "Support Hours",
                    value: "Mon – Sat: 10:00 AM - 7:00 PM IST",
                    detail: "Dedicated customer support desk",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3.5 p-3 rounded-2xl bg-paper/60 border border-black/[0.04] transition-colors hover:bg-paper"
                  >
                    <div className="w-10 h-10 rounded-xl bg-chalk-teal/10 flex items-center justify-center flex-shrink-0 text-chalk-teal mt-0.5">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-[11px] font-bold text-ink-green/50 uppercase tracking-wider font-body">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a
                          href={item.href}
                          {...(item.isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="text-sm font-body font-semibold text-ink-green hover:text-chalk-teal transition-colors block"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-body font-semibold text-ink-green">
                          {item.value}
                        </p>
                      )}
                      {item.detail && (
                        <p className="text-xs text-ink-green/50 font-body mt-0.5">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Phone Action Box */}
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-brass-gold/[0.08] border border-brass-gold/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-brass-gold animate-pulse" />
                  <h3 className="text-sm font-display font-bold text-ink-green">
                    Need Immediate Assistance?
                  </h3>
                </div>
                <p className="text-xs text-ink-green/75 font-body leading-relaxed max-w-xs">
                  Call our direct coaching helpline to get instant answers about setup or pricing plans.
                </p>
              </div>
              <a
                href="tel:+918080161421"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink-green text-white text-xs sm:text-sm font-bold shadow-sm hover:bg-ink-green/90 transition-colors whitespace-nowrap shrink-0"
              >
                <Phone className="w-4 h-4 text-brass-gold" />
                <span>Call +91 80801 61421</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="bg-card-surface rounded-2xl shadow-card p-6 md:p-8">
            <h2 className="text-xl font-display font-bold text-ink-green mb-6">
              Send us a message
            </h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
