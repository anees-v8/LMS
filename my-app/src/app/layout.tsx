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
      email: "support@campusweb.co.in",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+91-8080161421",
        contactType: "customer support",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
        addressRegion: "Maharashtra",
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
      applicationSubCategory: "Coaching Institute Management Software, LMS, Institute ERP",
      operatingSystem: "Web, Android, iOS",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "128",
        bestRating: "5",
        worstRating: "1",
      },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: "13",
        highPrice: "49",
        offerCount: "3",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          priceCurrency: "INR",
          unitText: "student / month",
        },
        offers: [
          {
            "@type": "Offer",
            name: "Basic Plan",
            price: "13",
            priceCurrency: "INR",
            priceValidUntil: "2027-12-31",
            description: "Starts at ₹13/student/mo. Student & batch management, dynamic QR attendance, fee tracking, online tests, doubt solving, 1 teacher.",
          },
          {
            "@type": "Offer",
            name: "Pro Plan",
            price: "19",
            priceCurrency: "INR",
            priceValidUntil: "2027-12-31",
            description: "Starts at ₹19/student/mo. Everything in Basic + WhatsApp alerts & receipts, video library, live classes, up to 5 teachers.",
          },
          {
            "@type": "Offer",
            name: "Elite Plan",
            price: "35",
            priceCurrency: "INR",
            priceValidUntil: "2027-12-31",
            description: "Starts at ₹35/student/mo. Everything in Pro + up to 20 teachers, priority support, and Free Institute Public Web Page Setup.",
          },
        ],
      },
      featureList: [
        "5-Second Dynamic QR Attendance with Anti-Proxy Safeguards",
        "Direct Bank Fee Collections with 0% Platform Commission",
        "Automated WhatsApp Payment Receipts & Absent Alerts",
        "Dedicated Teacher Mobile Logins for Assigned Subjects",
        "Scheduled Online MCQ Tests with Instant Auto-Grading",
        "Student & Parent Android Mobile App",
        "1-Click Bulk Student Import from Excel",
      ],
      description:
        "Mobile-first operating system and LMS software for Indian coaching institutes, tuition classes, and test-prep academies.",
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.campusweb.co.in/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need a computer or laptop to run CampusWeb?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. CampusWeb is designed mobile-first. Teachers, directors, and students can manage attendance, create tests, collect fees, and track performance 100% from their Android phones.",
          },
        },
        {
          "@type": "Question",
          name: "Does CampusWeb charge commission on student fee payments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Zero commission. Your fee collection integrates directly with your institute's UPI or Razorpay account — every single rupee goes straight to your bank account.",
          },
        },
        {
          "@type": "Question",
          name: "How do parents receive fee receipts and attendance updates?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Whenever fees are paid or recorded, parents receive an automated, official PDF receipt link directly on WhatsApp. Absent alerts and test scorecards are also delivered seamlessly.",
          },
        },
        {
          "@type": "Question",
          name: "Can I import our existing students from an Excel sheet?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! You can bulk import all your existing students with their name, roll number, phone number, and batch in a single click using our Excel import tool in under 60 seconds.",
          },
        },
        {
          "@type": "Question",
          name: "Is there a free trial before deciding?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, we provide a full-access 7-day free trial with personal guided onboarding. No credit card or advance payment required.",
          },
        },
        {
          "@type": "Question",
          name: "How secure is our student and fee data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Your institute's records are protected with bank-grade 256-bit SSL encryption and private cloud storage hosted on Google Cloud and AWS in India. We never sell, share, or advertise to your students.",
          },
        },
      ],
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
