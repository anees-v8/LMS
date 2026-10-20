import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — CampusWeb",
  description:
    "The terms and conditions governing the use of the CampusWeb platform, services, and mobile applications.",
  alternates: {
    canonical: "/legals/terms-conditions",
  },
};

export default function TermsConditionsPage() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="container-main max-w-3xl py-16 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink-green mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-ink-green/50 font-body mb-10">
          Last updated: September 1, 2026
        </p>

        <div className="legal-content">
          <p>
            Please read these Terms and Conditions (&ldquo;Terms&rdquo;)
            carefully before using the Campus mobile app or website
            (campusweb.co.in), operated by Campus (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; &ldquo;our&rdquo;). By creating an account,
            registering an institute, or using the app in any way, you
            agree to be bound by these Terms.
          </p>
          <p>
            If you are using Campus on behalf of a coaching institute, you
            confirm that you have the authority to accept these Terms on
            that institute&rsquo;s behalf.
          </p>

          <h2>1. What Campus Is</h2>
          <p>
            Campus is a software platform that lets coaching institutes
            manage students, teachers, batches, attendance, fees, tests,
            and related academic administration. The platform has four
            types of accounts:
          </p>
          <ul>
            <li>
              <strong>Super Admin</strong> &mdash; the Campus platform
              operator (us)
            </li>
            <li>
              <strong>Coaching Admin</strong> &mdash; represents a
              subscribing institute; manages that institute&rsquo;s
              teachers, students, and settings
            </li>
            <li>
              <strong>Teacher</strong> &mdash; manages their assigned
              batches, attendance, content, and tests
            </li>
            <li>
              <strong>Student</strong> &mdash; views their own attendance,
              tests, fees, and course content
            </li>
          </ul>
          <p>
            Each institute&rsquo;s data is kept separate from every other
            institute&rsquo;s data.
          </p>

          <h2>2. Accounts and Responsibilities</h2>
          <ul>
            <li>
              Accounts are created by a coaching admin for their
              institute&rsquo;s teachers and students, or by a coaching
              admin registering their own institute.
            </li>
            <li>
              You are responsible for keeping your login credentials
              confidential and for all activity that happens under your
              account.
            </li>
            <li>
              Coaching admins are responsible for the accuracy of the data
              they or their staff enter about their students and teachers,
              and for having the appropriate right to enter that
              information into the platform (for example, a
              parent/guardian&rsquo;s phone number).
            </li>
            <li>
              You must provide a working phone number to create an account,
              since it is used as your login identifier.
            </li>
            <li>
              We may suspend or terminate an account that we reasonably
              believe is being used fraudulently, abusively, or in
              violation of these Terms.
            </li>
          </ul>

          <h2>3. Free Trial</h2>
          <p>
            New institutes receive a <strong>7-day free trial</strong> with
            full access to the platform&rsquo;s features, starting from the
            date the institute is registered. During the trial, no payment
            is required.
          </p>
          <p>
            If a paid subscription is not activated before the trial ends,
            some write actions (such as adding new students or recording
            new attendance) may be limited until a plan is chosen and paid
            for. Existing data remains visible and is not deleted when a
            trial ends.
          </p>

          <h2>4. Subscription Plans and Billing</h2>
          <ul>
            <li>
              Campus offers subscription plans billed either{" "}
              <strong>per student</strong> (a rate multiplied by the
              institute&rsquo;s student count) or at a{" "}
              <strong>flat monthly rate</strong>, depending on the plan the
              institute selects, at the pricing shown in the app or on our
              website at the time of purchase.
            </li>
            <li>
              Payments are processed through <strong>Razorpay</strong>, a
              third-party payment gateway. We do not store your card or
              bank account details.
            </li>
            <li>
              <strong>Billing is not automatically recurring.</strong> Each
              payment is a one-time transaction that extends your
              institute&rsquo;s access for the applicable billing period
              (monthly, quarterly, or yearly). We track your next billing
              due date and will notify you as it approaches, but your
              coaching admin must manually initiate each renewal payment
              through the app.
            </li>
            <li>
              If payment is not made by the due date, we allow a short
              grace period (currently 2 days) before the account is marked
              as <strong>past due</strong>. Once past due, some write
              actions in the app may be blocked until payment is completed;
              you can still view your existing data.
            </li>
            <li>
              We reserve the right to change subscription pricing for
              future billing periods. We will make reasonable efforts to
              communicate pricing changes in advance.
            </li>
          </ul>

          <h2>5. Refunds</h2>
          <p>
            <strong>All payments are non-refundable</strong>, except where
            required by applicable law. We do not currently offer partial
            refunds for unused portions of a billing period, plan
            downgrades, or early cancellation. If you believe you were
            charged in error, contact us at the details in Section 12 and
            we will review the matter.
          </p>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Use the platform to store or transmit content that is
              unlawful, harassing, defamatory, or that infringes
              someone else&rsquo;s rights
            </li>
            <li>
              Attempt to access another institute&rsquo;s data, or another
              user&rsquo;s account, without authorization
            </li>
            <li>
              Interfere with or disrupt the platform&rsquo;s normal
              operation (including attempting to bypass rate limits,
              security measures, or authentication)
            </li>
            <li>
              Use the platform&rsquo;s WhatsApp-link or notification
              features to send unsolicited or abusive messages
            </li>
            <li>
              Reverse-engineer, decompile, or attempt to extract the source
              code of the app, except to the extent applicable law
              expressly permits this
            </li>
          </ul>
          <p>
            We may suspend access for accounts that violate this section.
          </p>

          <h2>7. Content and Data Ownership</h2>
          <ul>
            <li>
              An institute retains ownership of the student, teacher,
              attendance, fee, and academic data it enters into the
              platform (&ldquo;Institute Data&rdquo;).
            </li>
            <li>
              We do not claim ownership of Institute Data. We use it only
              to provide the service to that institute, as described in our
              Privacy Policy.
            </li>
            <li>
              Course content (videos, documents, images) uploaded by a
              teacher or coaching admin remains the property of the
              uploading institute; the institute is responsible for having
              the rights to upload and share that content with its own
              students.
            </li>
            <li>
              If a coaching admin deletes a student or teacher record, the
              associated data (attendance, test results, fee history,
              notifications) is permanently removed from our systems and
              cannot be recovered by us.
            </li>
          </ul>

          <h2>8. Third-Party Services</h2>
          <p>
            The platform relies on third-party services to operate,
            including Razorpay (payments), Firebase (push notifications),
            Google (optional calendar/Meet integration for teachers),
            Resend (email delivery, for applicable plans), Cloudinary (file
            storage), Supabase (database hosting), and Vercel (application
            hosting). Your use of features that rely on these services is
            also subject to those providers&rsquo; own terms, where
            applicable (for example, connecting a Google account is subject
            to Google&rsquo;s terms of service).
          </p>

          <h2>9. Availability and Changes to the Service</h2>
          <ul>
            <li>
              We aim to keep the platform available and reliable but do not
              guarantee uninterrupted, error-free operation. Scheduled
              maintenance, third-party outages, or unforeseen issues may
              cause temporary downtime.
            </li>
            <li>
              We may add, change, or remove features over time as the
              platform develops. We will make reasonable efforts to avoid
              removing features that would materially reduce the value of
              an active paid subscription without notice.
            </li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable law:</p>
          <ul>
            <li>
              Campus is provided &ldquo;as is&rdquo; without warranties of
              any kind, express or implied.
            </li>
            <li>
              We are not liable for indirect, incidental, or consequential
              damages arising from your use of the platform, including loss
              of data, loss of business, or loss of profits, except where
              such liability cannot be excluded by law.
            </li>
            <li>
              Our total liability for any claim arising from these Terms or
              your use of the platform is limited to the amount you paid us
              in the 3 months preceding the claim.
            </li>
          </ul>
          <p>
            Nothing in these Terms limits liability for fraud, willful
            misconduct, or anything else that cannot be limited under
            applicable law.
          </p>

          <h2>11. Termination</h2>
          <ul>
            <li>
              A coaching admin may stop using the platform at any time;
              this does not entitle the institute to a refund for the
              current billing period (see Section 5).
            </li>
            <li>
              We may suspend or terminate an institute&rsquo;s access for
              violating these Terms, non-payment beyond the grace period,
              or if we reasonably believe continued access poses a risk to
              the platform or other users.
            </li>
            <li>
              Upon termination, we may retain Institute Data for a
              reasonable period as required for legal, accounting, or
              legitimate business purposes, after which it may be deleted.
            </li>
          </ul>

          <h2>12. Contact Us</h2>
          <p>Questions about these Terms can be directed to:</p>
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

          <h2>13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will update the
            &ldquo;Last updated&rdquo; date above when changes are made.
            Continuing to use Campus after changes take effect means you
            accept the revised Terms. If changes are material, we will
            make reasonable efforts to notify coaching admins in advance.
          </p>
        </div>
      </div>
    </main>
  );
}
