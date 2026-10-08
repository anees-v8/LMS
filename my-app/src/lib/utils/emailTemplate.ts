/**
 * Shared HTML wrapper for tenant-facing transactional emails (fee due,
 * attendance, live class reminders, etc.), matching the app's theme —
 * same palette as my-app/src/app/globals.css (--ink-green, --brass-gold,
 * --chalk-teal). Table-based layout for broad email-client compatibility.
 */
export function renderNotificationEmail(title: string, body: string | undefined): string {
  const safeTitle = escapeHtml(title);
  const safeBody = body ? escapeHtml(body) : '';

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:#F4F6F3; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F3; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color:#1F2E27; padding:20px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle; padding-right:10px;">
                      <img src="https://my-app-tau-umber-67.vercel.app/logo-white.png" alt="Campus" width="28" height="28" style="display:block;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="color:#FFFFFF; font-size:18px; font-weight:700; letter-spacing:0.02em;">Campus</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px; color:#1F2E27; font-size:20px; font-weight:700; line-height:1.3;">
                  ${safeTitle}
                </h1>
                ${
                  safeBody
                    ? `<p style="margin:0; color:#1F2E27B3; font-size:14px; line-height:1.6;">${safeBody}</p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <div style="height:1px; background-color:#F4F6F3; margin-bottom:20px;"></div>
                <p style="margin:0; color:#1F2E2780; font-size:12px; line-height:1.5;">
                  This is an automated notification from your institute's Campus account.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * OTP email — a dedicated, higher-polish layout (not the generic
 * notification wrapper): a hidden preheader for the inbox preview line, a
 * clear eyebrow/heading hierarchy, a code block with a gold accent rule to
 * draw the eye, a muted expiry chip, and a security note explaining what
 * happens if the recipient didn't request this. Used for password reset
 * and OTP-gated email/password changes; sent directly via Resend
 * (otp.service.ts's getResend()), bypassing the plan-gated notification
 * pipeline (hasFeature('email_notifications')) since this must work for
 * every tenant/plan, not just ones with that feature.
 */
export function renderOtpEmail(code: string, purposeLabel: string, expiryMinutes: number): string {
  const safeCode = escapeHtml(code);
  const safeLabel = escapeHtml(purposeLabel);
  const digits = safeCode
    .split('')
    .map(
      (d) =>
        `<td style="width:44px; height:52px; background-color:#FFFFFF; border:1px solid #E3E8E3; border-radius:10px; text-align:center; vertical-align:middle;"><span style="font-size:26px; font-weight:700; color:#1F2E27; font-family:'SF Mono',Consolas,Menlo,monospace;">${d}</span></td>`
    )
    .join(`<td style="width:6px;"></td>`);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0; padding:0; background-color:#EEF1EC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <!-- Preheader: shown as the inbox preview line, hidden in the body -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      Your code is ${safeCode} — it expires in ${expiryMinutes} minutes.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF1EC; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px; background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 4px 20px rgba(31,46,39,0.08);">
            <!-- Header -->
            <tr>
              <td style="background-color:#1F2E27; padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle; padding-right:10px;">
                      <img src="https://my-app-tau-umber-67.vercel.app/logo-white.png" alt="Campus" width="26" height="26" style="display:block;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="color:#FFFFFF; font-size:17px; font-weight:700; letter-spacing:0.02em;">Campus</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Accent rule -->
            <tr>
              <td style="height:4px; background-color:#A87D26; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <p style="margin:0 0 8px; color:#A87D26; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                  Verification Code
                </p>
                <h1 style="margin:0 0 10px; color:#1F2E27; font-size:21px; font-weight:700; line-height:1.35;">
                  ${safeLabel}
                </h1>
                <p style="margin:0 0 28px; color:#5B6B61; font-size:14px; line-height:1.6;">
                  Enter this code to continue. For your security, it only works once.
                </p>
              </td>
            </tr>
            <!-- Code block -->
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                  <tr>${digits}</tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 32px; text-align:center;">
                <span style="display:inline-block; background-color:#FBF4E8; color:#8A6416; font-size:12px; font-weight:600; padding:6px 14px; border-radius:999px;">
                  Expires in ${expiryMinutes} minutes
                </span>
              </td>
            </tr>
            <!-- Security note -->
            <tr>
              <td style="padding:0 32px 32px;">
                <div style="height:1px; background-color:#EEF1EC; margin-bottom:20px;"></div>
                <p style="margin:0; color:#8A948D; font-size:12px; line-height:1.6;">
                  Didn't request this? You can safely ignore this email — your account is safe and no changes will be made without this code.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0; color:#8A948D; font-size:11px; text-align:center;">
            Sent by Campus · campusweb.co.in
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
