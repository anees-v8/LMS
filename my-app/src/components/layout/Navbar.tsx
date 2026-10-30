"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_LINKS } from "@/utils/constants";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/utils/cn";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const pathname = usePathname();
  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav className="bg-white shadow-nav sticky top-0 z-50">
      <div className="container-main">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
            <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center shrink-0">
              <Image src="/brand-logo.png" alt="Campus Logo" width={48} height={48} className="object-contain" priority />
            </div>
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-display font-bold text-ink-green leading-tight">
                Campus
              </span>
              <span className="text-[10px] text-ink-green/60 font-body leading-none hidden sm:block">
                Run Your Institute. Delight Every Student.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <div key={link.label} className="relative group">
                {link.children ? (
                  <button
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 text-sm font-body font-medium rounded-lg transition-colors",
                      pathname === link.href
                        ? "text-brass-gold"
                        : "text-ink-green hover:text-chalk-teal"
                    )}
                    onMouseEnter={() => setOpenDropdown(link.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {link.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "px-3 py-2 text-sm font-body font-medium rounded-lg transition-colors inline-block",
                      pathname === link.href
                        ? "text-brass-gold"
                        : "text-ink-green hover:text-chalk-teal"
                    )}
                  >
                    {link.label}
                  </Link>
                )}

                {/* Dropdown */}
                {link.children && (
                  <div
                    onMouseEnter={() => setOpenDropdown(link.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                    className={cn(
                      "absolute top-full left-0 mt-0 w-48 bg-white rounded-xl shadow-card-hover border border-paper py-2 transition-all duration-200",
                      openDropdown === link.label
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-2"
                    )}
                  >
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block px-4 py-2 text-sm font-body text-ink-green hover:bg-paper hover:text-chalk-teal transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
              <Button variant="primary" size="sm" href="/demo" withArrow>
              Book a Free Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-paper transition-colors"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-ink-green" />
            ) : (
              <Menu className="w-6 h-6 text-ink-green" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden border-t border-paper"
          >
            <div className="container-main py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <div key={link.label}>
                  {link.children ? (
                    <>
                      <button
                        onClick={() =>
                          setOpenDropdown(
                            openDropdown === link.label ? null : link.label
                          )
                        }
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-body font-medium text-ink-green rounded-lg hover:bg-paper transition-colors"
                      >
                        {link.label}
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            openDropdown === link.label && "rotate-180"
                          )}
                        />
                      </button>
                      <AnimatePresence>
                        {openDropdown === link.label && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden pl-4"
                          >
                            {link.children.map((child) => (
                              <Link
                                key={child.label}
                                href={child.href}
                                onClick={closeMobileMenu}
                                className="block px-3 py-2 text-sm font-body text-ink-green/70 hover:text-chalk-teal"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className={cn(
                        "block px-3 py-2.5 text-sm font-body font-medium rounded-lg transition-colors",
                        pathname === link.href
                          ? "text-brass-gold bg-brass-gold/5"
                          : "text-ink-green hover:bg-paper"
                      )}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="pt-3 border-t border-paper">
                <Button
                  variant="primary"
                  size="md"
                  href="/demo"
                  withArrow
                  className="w-full"
                >
                  Book a Free Demo
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
