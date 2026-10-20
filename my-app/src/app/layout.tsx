import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import Topbar from "@/components/layout/Topbar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.campusweb.co.in"),
  title: {
    default: "CampusWeb — Operating System for Coaching Institutes",
    template: "%s | CampusWeb",
  },
  description:
    "All-in-one coaching institute management software in India. Automate student attendance, fee collections, teacher mobile logins, and online tests.",
  keywords: [
    "coaching institute management software",
    "LMS for coaching institutes",
    "tuition management system",
    "student attendance app",
    "coaching fees collection software",
    "teacher mobile app for coaching",
    "EdTech software India",
    "coaching ERP",
    "CampusWeb",
  ],
  authors: [{ name: "CampusWeb", url: "https://www.campusweb.co.in" }],
  creator: "CampusWeb",
  publisher: "CampusWeb",
  category: "Education Technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.campusweb.co.in",
    siteName: "CampusWeb",
    title: "CampusWeb — Operating System for Coaching Institutes",
    description:
      "All-in-one coaching institute management software in India. Automate student attendance, fee collections, teacher mobile logins, and online tests.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CampusWeb — Built for Coaching. Crafted for Speed & Scale.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CampusWeb — Operating System for Coaching Institutes",
    description:
      "All-in-one coaching institute management software in India. Automate student attendance, fee collections, teacher mobile logins, and online tests.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.png?v=3", sizes: "64x64", type: "image/png" },
      { url: "/favicon.ico?v=3" },
    ],
    shortcut: "/icon.png?v=3",
    apple: "/icon.png?v=3",
  },
  verification: {
    google: "google8cb08c077cfae0a6",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.campusweb.co.in/#organization",
      name: "CampusWeb",
      url: "https://www.campusweb.co.in",
      logo: {
        "@type": "ImageObject",
        url: "https://www.campusweb.co.in/logo-white.png",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-8080161421",
        contactType: "customer support",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.campusweb.co.in/#website",
      url: "https://www.campusweb.co.in",
      name: "CampusWeb",
      publisher: {
        "@id": "https://www.campusweb.co.in/#organization",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.campusweb.co.in/#software",
      name: "CampusWeb",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, Android, iOS",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      description:
        "Operating system and LMS software for coaching institutes with student mobile apps, attendance tracking, and fee management.",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Topbar />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
