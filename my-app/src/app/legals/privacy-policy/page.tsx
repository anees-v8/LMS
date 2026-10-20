import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Campus",
  description:
    "How Campus collects, uses, stores, and shares information through the Campus mobile app and website.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="container-main max-w-3xl py-16 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink-green mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-ink-green/50 font-body mb-10">
          Last updated: September 1, 2026
        </p>

        <div className="legal-content">
          <p>
            This Privacy Policy describes how Campus (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; &ldquo;our&rdquo;) collects, uses, stores, and
            shares information through:
          </p>
          <ul>
            <li>
              the <strong>Campus mobile app</strong> (Android/iOS, used by
              coaching institute admins, teachers, and students), and
            </li>
            <li>
              the <strong>Campus marketing website</strong> (campusweb.co.in
              &mdash; informational pages and the demo-booking/contact
              forms).
            </li>
          </ul>
          <p>
            Campus is a software platform that coaching institutes
            (&ldquo;institutes&rdquo;) use to manage their own students,
            teachers, attendance, fees, tests, and related academic
            operations. Each institute is a separate customer
            (&ldquo;tenant&rdquo;) of Campus, and its coaching admin(s)
            control what student and teacher data is entered into the
            platform on the institute&rsquo;s behalf.
          </p>
          <p>
            If you are a student or parent, your institute &mdash; not
            Campus &mdash; is typically the one that created your account
            and entered your information. Questions about a specific
            student&rsquo;s data are often best directed to your institute
            first.
          </p>

          <h2>1. Information We Collect</h2>

          <h3>1.1 Account information (all roles)</h3>
          <p>
            When an institute&rsquo;s coaching admin creates an account for
            a teacher or student, or when a coaching admin registers their
            institute, we store:
          </p>
          <ul>
            <li>Full name</li>
            <li>
              Phone number (used as the login identifier; must be unique
              across the platform)
            </li>
            <li>Email address (optional)</li>
            <li>Role (coaching admin, teacher, or student)</li>
            <li>Password (never stored in plain text &mdash; see Section 5)</li>
            <li>Profile photo, if uploaded</li>
          </ul>

          <h3>1.2 Student-specific information</h3>
          <p>For each student, an institute additionally stores:</p>
          <ul>
            <li>Roll number and grade/class</li>
            <li>
              Parent/guardian name (optional) and parent/guardian phone
              number (required)
            </li>
            <li>
              Batch/subject enrollment, attendance records, test scores and
              submitted answers, and fee payment history
            </li>
          </ul>

          <h3>1.3 Teacher-specific information</h3>
          <p>For each teacher, an institute additionally stores:</p>
          <ul>
            <li>
              Status (active, on leave, or inactive) and leave dates, if
              applicable
            </li>
            <li>
              If the teacher chooses to connect a Google account (optional,
              used only for scheduling live classes &mdash; see Section 3),
              we store a long-lived Google refresh token and the connected
              Google account&rsquo;s email address.
            </li>
          </ul>

          <h3>1.4 Prospective-customer information (demo requests / contact form)</h3>
          <p>
            If you submit the &ldquo;Book a Demo&rdquo; or contact form on
            our website, we collect: your name, institute name, phone
            number, email (optional), city, approximate student count, and
            any message you write. This information is used only to follow
            up about a possible institute subscription and is not shared
            with any institute&rsquo;s students or teachers.
          </p>

          <h3>1.5 Payment information</h3>
          <p>
            When an institute pays for a subscription, payment is processed
            by <strong>Razorpay</strong>, a third-party payment gateway. We
            do not collect or store your card, UPI, or bank details &mdash;
            those are entered directly into Razorpay&rsquo;s own secure
            checkout. We store only: the subscription amount, a payment
            reference ID, and a payment-verification signature, so we can
            confirm a payment succeeded.
          </p>
          <p>
            For fees a student pays to their institute directly (e.g., in
            cash, at the institute&rsquo;s office), the institute&rsquo;s
            coaching admin manually records the amount and payment method
            in the app. Campus does not process or touch this money &mdash;
            it is a record-keeping entry made by the institute.
          </p>

          <h3>1.6 Push notification tokens</h3>
          <p>
            If you allow notifications, your device registers a
            push-notification token with us (via Firebase Cloud Messaging)
            so we can deliver in-app alerts (e.g., &ldquo;fee due,&rdquo;
            &ldquo;new class assigned,&rdquo; &ldquo;test
            scheduled&rdquo;). If a token stops working (e.g., the app was
            uninstalled), we delete it automatically the next time we try
            to use it and it fails.
          </p>

          <h3>1.7 What we do NOT collect</h3>
          <p>
            We do not collect your precise location, biometric data, or
            government ID numbers. We do not use any third-party analytics,
            advertising, or crash-tracking tools in the app or website (as
            of the date of this policy) &mdash; we do not track your
            behavior for advertising purposes, and no data is sold to
            advertisers.
          </p>

          <h2>2. How We Use Information</h2>
          <p>We use the information above to:</p>
          <ul>
            <li>
              Operate your institute&rsquo;s account: attendance tracking,
              fee tracking, batch/subject management, test creation and
              scoring, and academic reporting
            </li>
            <li>
              Send you notifications relevant to your role (fee reminders,
              attendance alerts, new content, live class schedules, test
              reminders) via in-app notifications, push notifications, and,
              for institutes on plans that include it, email
            </li>
            <li>
              Let a teacher generate a WhatsApp message to a parent&rsquo;s
              phone number (see Section 3.4) &mdash; this only opens the
              teacher&rsquo;s own WhatsApp app with a pre-filled message; we
              do not send WhatsApp messages ourselves
            </li>
            <li>Process subscription payments and maintain billing records</li>
            <li>Respond to demo requests and support inquiries</li>
            <li>
              Maintain the security and integrity of the platform (e.g.,
              detecting invalid login attempts)
            </li>
          </ul>

          <h2>3. Third Parties We Share Information With</h2>
          <p>
            We work with the following service providers, each of whom
            processes a limited, specific set of data on our behalf:
          </p>

          <h3>3.1 Supabase (database hosting)</h3>
          <p>
            All platform data is stored in a PostgreSQL database hosted by
            Supabase, located in the Mumbai (ap-south-1) AWS region.
            Supabase does not use this data for its own purposes &mdash; it
            is our data processor.
          </p>

          <h3>3.2 Vercel (application hosting)</h3>
          <p>
            Our backend and website run on Vercel&rsquo;s hosting
            infrastructure. Vercel processes requests to operate the
            service but does not receive separate access to your stored
            data beyond what is necessary to run the application.
          </p>

          <h3>3.3 Firebase Cloud Messaging (push notifications)</h3>
          <p>
            We send your device&rsquo;s push token, along with a
            notification title and message body, to Firebase (a Google
            service) so it can deliver the notification to your device. We
            do not send your name, phone number, or other account fields to
            Firebase as structured data &mdash; only the notification text
            itself, which may incidentally mention a name (e.g.,
            &ldquo;Payment received, thank you!&rdquo;).
          </p>

          <h3>3.4 WhatsApp &mdash; deep links only, not the WhatsApp Business API</h3>
          <p>
            When a teacher or coaching admin uses the &ldquo;remind via
            WhatsApp&rdquo; feature, the app builds a <code>wa.me</code>{" "}
            link containing a pre-filled message and opens the user&rsquo;s
            own installed WhatsApp app.{" "}
            <strong>
              No message or phone number is transmitted to WhatsApp, Meta,
              or any third-party messaging service by Campus itself
            </strong>{" "}
            &mdash; the message is only actually sent if the teacher or
            admin manually presses send inside their own WhatsApp app. We
            do not use the paid WhatsApp Business API and do not have
            visibility into whether a message was actually delivered or
            read.
          </p>

          <h3>3.5 Google (optional, teacher-initiated only)</h3>
          <p>
            If a teacher chooses to connect their Google account, we
            request permission to create and manage Google Calendar events
            (specifically, the <code>calendar.events</code> scope) so we
            can generate Google Meet links for live classes. We also read
            the connected account&rsquo;s email address to display which
            Google account is linked. We store a Google refresh token so
            the teacher does not need to reconnect every session. This
            connection is entirely optional, initiated by the teacher, and
            used only to create/delete the teacher&rsquo;s own calendar
            events &mdash; no student data is ever sent to Google.
          </p>

          <h3>3.6 Razorpay (payments)</h3>
          <p>
            Described in Section 1.5. Razorpay receives the payment amount,
            currency, and order metadata (institute ID and billing period,
            not personal names) needed to process a transaction.
            Razorpay&rsquo;s own privacy policy governs how it handles your
            payment card/bank details.
          </p>

          <h3>3.7 Email delivery (Resend)</h3>
          <p>
            For institutes on a subscription plan that includes email
            notifications, we send notification emails (the same content as
            push notifications) via Resend, a transactional email provider,
            to the email address on file for the relevant user. If a
            student, teacher, or admin has no email address on file, they
            do not receive these emails &mdash; only in-app and push
            notifications.
          </p>

          <h3>3.8 Internal operational notifications</h3>
          <p>
            When someone submits a demo request or contact form, a summary
            of that submission is sent to our own internal email inbox and
            Telegram channel so our team can follow up. This is an internal
            tool for us, not a data-sharing arrangement with any outside
            company.
          </p>

          <h3>3.9 Cloudinary (file uploads)</h3>
          <p>
            Course content (videos, PDFs, images) and profile photos that
            institutes upload are stored with Cloudinary, a media-hosting
            provider. We do not send this content to any other third party.
          </p>

          <p>
            We do not sell your personal information to anyone, and we do
            not share it with advertisers.
          </p>

          <h2>4. Data Storage on Your Device</h2>
          <p>
            The mobile app stores a local, on-device cache of recent data
            (such as your dashboard, attendance, and fee information) so
            the app loads quickly and can show recent data with a weak
            connection. This cache is stored in the app&rsquo;s local
            storage on your device and is automatically cleared when you
            log out. Your login session token is also stored locally on
            your device in the app&rsquo;s standard local storage.
          </p>

          <h2>5. How We Protect Your Information</h2>
          <ul>
            <li>
              Passwords are never stored in plain text &mdash; they are
              hashed using bcrypt before being saved.
            </li>
            <li>
              Login sessions use time-limited access tokens (valid for 15
              minutes) and longer-lived refresh tokens (valid for 30 days)
              to keep you signed in without repeatedly re-entering your
              password. These tokens identify your account by an internal
              ID only &mdash; they do not contain your name, phone number,
              or email.
            </li>
            <li>All connections to our servers use HTTPS encryption.</li>
          </ul>
          <p>
            No method of storage or transmission is 100% secure, and we
            cannot guarantee absolute security, but we take reasonable,
            industry-standard measures to protect your information.
          </p>

          <h2>6. Data Retention and Deletion</h2>
          <ul>
            <li>
              Your institute&rsquo;s coaching admin controls student and
              teacher records within their institute. If a coaching admin
              removes a student or teacher from the platform, that
              person&rsquo;s account and associated records (attendance,
              test results, fee history, notifications) are permanently
              deleted from our systems &mdash; this action cannot be undone
              by us.
            </li>
            <li>
              A coaching admin can also <strong>suspend</strong> a
              student&rsquo;s or teacher&rsquo;s access without deleting
              their data &mdash; this is reversible and simply blocks that
              person from logging in until reactivated.
            </li>
            <li>
              If an institute&rsquo;s subscription lapses, we do not delete
              the institute&rsquo;s data. The institute&rsquo;s coaching
              admin retains the ability to view existing records; some
              actions that create new data may be limited until the
              subscription is renewed.
            </li>
            <li>
              Demo request / contact form submissions are retained so we
              can track and follow up on sales inquiries; we do not
              currently have an automatic deletion schedule for this data.
            </li>
            <li>
              At present, we do not offer a fully self-service &ldquo;delete
              my account&rdquo; or &ldquo;export my data&rdquo; feature
              within the app. If you would like your personal data deleted
              or exported, please contact us using the details in Section
              9, or ask your institute&rsquo;s coaching admin to remove
              your account (Section 6, first bullet).
            </li>
          </ul>

          <h2>7. Children&rsquo;s Data</h2>
          <p>
            Campus is used by coaching institutes to manage students of
            varying ages, including students under 18. Student accounts are
            created and managed by the institute&rsquo;s coaching admin,
            not by the student signing up on their own &mdash; the admin
            sets the student&rsquo;s initial password when creating the
            account. We require institutes to collect a parent/guardian
            contact phone number for every student record.
          </p>
          <p>
            We do not knowingly allow students to create their own accounts
            without an institute&rsquo;s involvement, and we do not collect
            information directly from a student that goes beyond what
            their institute has chosen to enter (e.g., we do not ask
            students for a birthdate or age). If you are a parent and have
            concerns about your child&rsquo;s data on the platform, please
            contact your institute&rsquo;s coaching admin first, or reach
            us directly using Section 9.
          </p>

          <h2>8. Your Choices</h2>
          <ul>
            <li>
              <strong>Notifications:</strong> you can disable push
              notifications for the app in your device&rsquo;s system
              settings.
            </li>
            <li>
              <strong>WhatsApp reminders:</strong> these only open your own
              WhatsApp app with a pre-filled message &mdash; you choose
              whether to send it.
            </li>
            <li>
              <strong>Google account connection:</strong> a teacher can
              disconnect their Google account at any time from within the
              app; this deletes the stored refresh token.
            </li>
            <li>
              <strong>Account data:</strong> see Section 6 for how to
              request deletion.
            </li>
          </ul>

          <h2>9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or how your
            information is handled, contact us at:
          </p>
          <ul>
            <li>
              <strong>Email:</strong> support@campusweb.co.in
            </li>
            <li>
              <strong>Support:</strong> WhatsApp / Online Support Desk (Mon – Sat, 10:00 AM - 7:00 PM IST)
            </li>
            <li>
              <strong>Location:</strong> Mumbai, Maharashtra, India
            </li>
          </ul>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time as the
            platform evolves. We will update the &ldquo;Last updated&rdquo;
            date at the top of this page when changes are made. Continued
            use of the app or website after changes take effect means you
            accept the updated policy.
          </p>
        </div>
      </div>
    </main>
  );
}
