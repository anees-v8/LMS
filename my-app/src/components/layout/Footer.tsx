import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Clock, Mail, Tv, Camera, Share2, MessageCircle } from "lucide-react";
import { FOOTER_LINKS } from "@/utils/constants";

export default function Footer() {
  return (
    <footer className="bg-ink-green text-white">
      <div className="container-main py-12 md:py-16">
        <div className="flex flex-col lg:flex-row flex-wrap gap-10 lg:gap-6 justify-between">
          {/* Brand Column */}
          <div className="lg:max-w-[280px]">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 flex items-center justify-center shrink-0">
                <Image src="/logo-white.png" alt="Campus Logo" width={56} height={56} className="object-contain" priority />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold leading-tight text-white">
                  Campus
                </span>
                <span className="text-xs text-white/60 font-body leading-none mt-0.5">
                  Run Your Institute. Delight Every Student.
                </span>
              </div>
            </Link>
            <p className="text-xs text-white/60 font-body leading-relaxed mt-4">
              Modern mobile-first coaching management software engineered for Indian coaching centers, academies, and institutes.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-body font-semibold mb-4 text-white/80 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-body text-white/60 hover:text-brass-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-sm font-body font-semibold mb-4 text-white/80 uppercase tracking-wider">
              Solutions
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.solutions.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-body text-white/60 hover:text-brass-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>


          {/* Resources & Legal */}
          <div>
            <h4 className="text-sm font-body font-semibold mb-4 text-white/80 uppercase tracking-wider">
              Legal & Help
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-body text-white/60 hover:text-brass-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-body font-semibold mb-4 text-white/80 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-body text-white/60 hover:text-brass-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h4 className="text-sm font-body font-semibold mb-4 text-white/80 uppercase tracking-wider">
              Get in Touch
            </h4>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="tel:+918080161421"
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-body text-white hover:bg-white/15 transition-colors"
                >
                  <Phone className="w-4 h-4 text-brass-gold flex-shrink-0" />
                  <span className="font-semibold">+91 80801 61421</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm font-body text-white/70">
                <Clock className="w-4 h-4 text-brass-gold flex-shrink-0" />
                <span>Mon – Sat: 10:00 AM - 7:00 PM</span>
              </li>
              <li>
                <a
                  href="mailto:support@campusweb.co.in"
                  className="flex items-center gap-2.5 text-sm font-body text-white/70 hover:text-brass-gold transition-colors"
                >
                  <Mail className="w-4 h-4 text-brass-gold flex-shrink-0" />
                  <span>support@campusweb.co.in</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-main py-4">
          <p className="text-xs text-white/40 font-body text-center">
            © {new Date().getFullYear()} Campus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
