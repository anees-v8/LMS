import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  IndianRupee,
  Video,
  FileText,
  BookOpen,
  BarChart3,
  Shield,
  MessageCircle,
  Clock,
  TrendingUp,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ───────── Navigation ───────── */
export interface NavLink {
  label: string;
  href: string;
  children?: NavLink[];
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/* ───────── Trust Badges ───────── */
export interface TrustItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export const TRUST_BADGES: TrustItem[] = [
  { icon: Smartphone, title: "100% Mobile First", subtitle: "Runs natively on phone" },
  { icon: MessageSquare, title: "WhatsApp Receipts", subtitle: "Instant alerts to parents" },
  { icon: ShieldCheck, title: "Bank-Grade Privacy", subtitle: "Your data stays 100% private" },
  { icon: Zap, title: "Zero Commission", subtitle: "Direct payments to your bank" },
];

/* ───────── Key Features (Home) ───────── */
export interface Feature {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeColor?: "teal" | "gold";
  description: string;
  highlights?: string[];
  href?: string;
}

export const KEY_FEATURES: Feature[] = [
  {
    icon: LayoutDashboard,
    title: "Live Coaching Dashboard",
    badge: "Real-Time Pulse",
    badgeColor: "teal",
    description: "Get immediate visibility into active student count, batch health, and daily fee collections.",
    highlights: ["Revenue & dues breakdown", "Batch health status", "1-Tap quick actions"],
  },
  {
    icon: ClipboardCheck,
    title: "QR & Batch Attendance",
    badge: "5-Sec Scan",
    badgeColor: "teal",
    description: "Mark attendance in 5 seconds with dynamic QR code scanning or 1-tap batch rosters.",
    highlights: ["Dynamic QR scan", "Automated parent WhatsApp alerts", "Monthly attendance rate"],
  },
  {
    icon: IndianRupee,
    title: "Fees & WhatsApp Receipts",
    badge: "0% Commission",
    badgeColor: "gold",
    description: "Track dues, send 1-click WhatsApp reminders, and collect payments with zero platform commission.",
    highlights: ["Instant official PDF receipts", "WhatsApp reminder alerts", "0% platform commission"],
  },
  {
    icon: FileText,
    title: "Online Tests & Quizzes",
    badge: "Auto-Grading",
    badgeColor: "teal",
    description: "Schedule live online MCQs or record offline scores with automated grading and student analytics.",
    highlights: ["Live/Upcoming test status", "Subject-wise performance", "Instant student scorecard"],
  },
  {
    icon: Video,
    title: "Integrated Live Classes",
    badge: "1-Tap Launch",
    badgeColor: "teal",
    description: "Conduct Google Meet live lectures seamlessly inside the app without sharing raw links.",
    highlights: ["1-Tap Google Meet launch", "Automated student reminders", "Scheduled batch timetable"],
  },
  {
    icon: MessageCircle,
    title: "Doubt Clearing on WhatsApp",
    badge: "Direct Routing",
    badgeColor: "teal",
    description: "Students select batch-assigned teachers and resolve doubts directly on WhatsApp with full privacy.",
    highlights: ["Assigned subject routing", "Photo & voice note doubts", "Direct teacher chat"],
  },
  {
    icon: BookOpen,
    title: "Organized Video Library",
    badge: "Chapter-Wise",
    badgeColor: "teal",
    description: "Upload and categorize recorded lectures by subject and chapter for flexible self-paced revision.",
    highlights: ["Chapter-wise lectures", "Secure student-only access", "Revision on the go"],
  },
  {
    icon: Users,
    title: "Student & Parent Mobile App",
    badge: "Native Android",
    badgeColor: "gold",
    description: "A clean, modern mobile app for students and parents to track classes, tests, attendance, and fees.",
    highlights: ["Dedicated Android app", "Real-time push notifications", "Zero technical training needed"],
  },
];

/* ───────── Detailed Features (/features) ───────── */
export interface DetailedFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: string[];
}

export const DETAILED_FEATURES: DetailedFeature[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Get real-time overview of your institute's performance.",
    highlights: ["Students count", "Attendance %", "Fee collection stats"],
  },
  {
    icon: Users,
    title: "Students Management",
    description:
      "Manage student profiles, batches, courses and academic progress.",
    highlights: ["Student profiles", "Batch management", "Course tracking"],
  },
  {
    icon: ClipboardCheck,
    title: "Attendance Tracking",
    description:
      "Mark attendance easily by batch, date or individual student.",
    highlights: ["Batch-wise attendance", "Date filter", "Student records"],
  },
  {
    icon: IndianRupee,
    title: "Fees Management",
    description:
      "Track fees, manage dues and send reminders straight to WhatsApp.",
    highlights: ["Online payments", "Due reminders", "Payment history"],
  },
  {
    icon: Video,
    title: "Live Classes",
    description:
      "Take live classes with Google Meet integration in one click.",
    highlights: ["Google Meet", "Scheduled classes", "Upcoming classes view"],
  },
  {
    icon: BookOpen,
    title: "Video Library",
    description:
      "Upload, organize and share recorded lectures with students anytime.",
    highlights: ["Subject-wise library", "Upload lectures", "Student access"],
  },
  {
    icon: FileText,
    title: "Tests & Exams",
    description:
      "Create tests, auto evaluate and analyze performance instantly.",
    highlights: ["Auto evaluation", "Performance analytics", "Score tracking"],
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Powerful reports and analytics to make smart decisions.",
    highlights: ["Performance charts", "Trend analysis", "Export data"],
  },
];

/* ───────── How It Works ───────── */
export interface Step {
  step: number;
  title: string;
  description: string;
  subtext: string;
}

export const HOW_IT_WORKS_STEPS: Step[] = [
  {
    step: 1,
    title: "Book a Free Demo",
    description:
      "Schedule a demo with our expert and see how Campus can transform your institute.",
    subtext: "Takes less than 30 seconds",
  },
  {
    step: 2,
    title: "Quick Setup in 24 Hours",
    description:
      "We configure your batches, subjects, fee structures and import your student data.",
    subtext: "Go live within 24 hours",
  },
  {
    step: 3,
    title: "Add Students & Teachers",
    description:
      "Invite students and teachers, create batches and start your academic journey.",
    subtext: "Unlimited users",
  },
  {
    step: 4,
    title: "Start Managing & Growing",
    description:
      "Manage attendance, fees, live classes and more from one powerful dashboard.",
    subtext: "All-in-one management",
  },
];

/* ───────── USP Bar (How It Works page) ───────── */
export interface USPItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const USP_ITEMS: USPItem[] = [
  {
    icon: Shield,
    title: "100% Secure",
    description: "Your data is encrypted and always protected.",
  },
  {
    icon: MessageCircle,
    title: "Free WhatsApp Reminders",
    description: "One-tap WhatsApp messages for fees, attendance and more.",
  },
  {
    icon: Users,
    title: "Made for Coaching Institutes",
    description: "Every feature is designed keeping your daily needs in mind.",
  },
  {
    icon: TrendingUp,
    title: "Always Improving",
    description:
      "We keep adding new features to help your institute grow faster.",
  },
];

/* ───────── Pricing Guarantee Badges ───────── */
export const PRICING_BADGES = [
  "7 Days Free Trial",
  "No Credit Card Required",
  "Cancel Anytime",
  "Direct Founder Onboarding",
];

/* ───────── FAQs ───────── */
export interface FAQ {
  question: string;
  answer: string;
}

export const FAQS: FAQ[] = [
  {
    question: "Do I need a computer or laptop to run CampusWeb?",
    answer:
      "No. CampusWeb is designed mobile-first. Teachers, directors, and students can manage attendance, create tests, collect fees, and track performance 100% from their Android phones.",
  },
  {
    question: "How do parents receive fee receipts and attendance updates?",
    answer:
      "Whenever fees are paid or recorded, parents receive an automated, official receipt link directly on WhatsApp. Absent alerts and test scorecards are also delivered seamlessly.",
  },
  {
    question: "Can I import our existing students from an Excel sheet?",
    answer:
      "Yes! You can bulk import all your existing students with their name, roll number, phone number, and batch in a single click using our Excel import tool.",
  },
  {
    question: "Does CampusWeb charge commission on student fee payments?",
    answer:
      "Zero commission. Your fee collection integrates directly with your institute's UPI or Razorpay account — every single rupee goes straight to your bank account.",
  },
  {
    question: "Is there a free trial before deciding?",
    answer:
      "Yes, we provide a full-access 7-day free trial with personal guided onboarding. No credit card or advance payment required.",
  },
  {
    question: "How secure is our student and fee data?",
    answer:
      "Your institute's records are protected with bank-grade SSL encryption and private cloud storage. We never sell, share, or advertise to your students.",
  },
];

/* ───────── Footer Links ───────── */
export const FOOTER_LINKS = {
  product: [
    { label: "Features", href: "/features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Demo", href: "/demo" },
  ],
  solutions: [
    { label: "For Coaching Directors", href: "/#workflows" },
    { label: "For Teachers & Staff", href: "/#workflows" },
    { label: "For Students & Parents", href: "/#workflows" },
  ],
  resources: [
    { label: "Privacy Policy", href: "/legals/privacy-policy" },
    { label: "Terms & Conditions", href: "/legals/terms-conditions" },
    { label: "Book a Demo", href: "/demo" },
    { label: "Contact Us", href: "/contact" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
  ],
};

/* ───────── Resources Page ───────── */
export const RESOURCE_CATEGORIES = [
  {
    icon: BookOpen,
    title: "Guides & Ebooks",
    description: "Step-by-step guides for your institute",
  },
  {
    icon: FileText,
    title: "Blog Articles",
    description: "Tips, trends and best practices",
  },
  {
    icon: ClipboardCheck,
    title: "Templates",
    description: "Ready-to-use templates & checklists",
  },
  {
    icon: Video,
    title: "Webinars",
    description: "Watch expert sessions on-demand",
  },
  {
    icon: BarChart3,
    title: "Case Studies",
    description: "Real stories from real institutes",
  },
  {
    icon: MessageCircle,
    title: "Help Center",
    description: "Get answers to your questions",
  },
];

export const LATEST_RESOURCES = [
  {
    id: 1,
    badge: "GUIDE",
    title: "Complete Institute Setup Checklist",
    description: "A step-by-step checklist to set up your coaching institute for success.",
    image: "/placeholder-guide.jpg",
    readTime: "6 min read",
    type: "PDF",
  },
  {
    id: 2,
    badge: "BLOG",
    title: "10 Ways to Improve Student Retention",
    description: "Proven strategies to keep students engaged and coming back.",
    image: "/placeholder-blog.jpg",
    readTime: "8 min read",
    type: "Read More",
  },
  {
    id: 3,
    badge: "TEMPLATE",
    title: "Daily Class Report Template",
    description: "Track class performance, attendance and topics with this free template.",
    image: "/placeholder-template.jpg",
    readTime: "Download",
    type: "Excel",
  },
  {
    id: 4,
    badge: "WEBINAR",
    title: "Digital Transformation for Coaching Institutes",
    description: "Learn how technology can help you scale your institute effectively.",
    image: "/placeholder-webinar.jpg",
    readTime: "45 min",
    type: "Watch Now",
  }
];

export const POPULAR_TOPICS = [
  "Institute Management",
  "Student Engagement",
  "Online Classes",
  "Fees & Payments",
  "Marketing",
  "Growth Strategies"
];

