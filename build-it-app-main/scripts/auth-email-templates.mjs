export const projectRef = "hpwquupkqssqqgqtwdyu";
export const siteUrl = "https://www.mysplit.co/";
export const logoUrl = `${siteUrl}split-android-chrome-512x512.png`;
export const supportEmail = "xtiancarrera@gmail.com";

export const templates = [
  {
    id: "confirmation",
    label: "Confirm signup",
    subject: "Confirm your email to join SPLIT",
    preheader: "One quick confirmation. Then your next collaboration starts here.",
    heading: "Welcome to SPLIT.",
    message: "Confirm your email to start creating split sheets and collaborating on your music.",
    action: "Confirm email",
    note: "If you didn't create a SPLIT account, you can ignore this email.",
  },
  {
    id: "recovery",
    label: "Reset password",
    subject: "Reset your SPLIT password",
    preheader: "A secure link to choose a new password for your SPLIT account.",
    heading: "Back to your music.",
    message: "We received a request to reset your SPLIT password. Choose a new one to get back to your account.",
    action: "Reset password",
    note: "Didn't request this? You can ignore this email. Your password won't change unless you complete the reset.",
  },
  {
    id: "email_change",
    label: "Change email address",
    subject: "Confirm your SPLIT email change",
    preheader: "Confirm the change to your sign-in email. Your split sheets stay with you.",
    heading: "A new email. Same SPLIT.",
    message: "Confirm the requested change to your SPLIT sign-in email.",
    detail: "For your security, confirm the change from both your current and new email inboxes. Your split sheets stay with your account.",
    action: "Confirm email change",
    note: "Didn't request this change? Don't confirm it. Contact SPLIT support using the link below.",
  },
];

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function renderEmail(template) {
  const details = template.id === "email_change" ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;table-layout:fixed;">
                    <tr><td style="padding:16px;background-color:#f4f6f8;border-left:3px solid #f8a50e;">
                      <p style="margin:0 0 5px;font-size:12px;line-height:18px;color:#5a6c84;">New sign-in email</p>
                      <p style="margin:0;font-size:15px;line-height:24px;font-weight:700;overflow-wrap:anywhere;word-break:break-all;">{{ .NewEmail }}</p>
                    </td></tr>
                  </table>
                  <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#5a6c84;">${escapeHtml(template.detail)}</p>` : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(template.subject)}</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      table, td { mso-table-lspace:0; mso-table-rspace:0; }
      img { -ms-interpolation-mode:bicubic; }
      a:focus-visible { outline:3px solid #0c2642; outline-offset:4px; }
      @media only screen and (max-width:600px) {
        .outer { padding:16px 12px !important; }
        .content { padding:28px 24px !important; }
        .email-heading { font-size:26px !important; line-height:34px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;width:100%;background-color:#f4f6f8;color:#0c2642;font-family:Arial,Helvetica,sans-serif;letter-spacing:0;">
    <div style="display:none;font-size:1px;line-height:1px;color:#f4f6f8;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(template.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;">
      <tr>
        <td class="outer" align="center" style="padding:40px 16px;">
          <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #dce2ea;border-radius:8px;">
            <tr>
              <td class="content" style="padding:32px 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="52" style="width:52px;vertical-align:middle;">
                      <img src="${logoUrl}" width="44" height="44" alt="SPLIT elephant" style="display:block;width:44px;height:44px;border:0;border-radius:6px;">
                    </td>
                    <td style="vertical-align:middle;font-size:26px;line-height:32px;font-weight:800;color:#0c2642;">SPLIT</td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding-top:28px;border-bottom:1px solid #dce2ea;font-size:1px;line-height:1px;">&nbsp;</td></tr>
                  <tr><td style="padding-top:28px;">
                    <h1 class="email-heading" style="margin:0 0 16px;font-size:30px;line-height:38px;font-weight:700;color:#0c2642;">${escapeHtml(template.heading)}</h1>
                    <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#5a6c84;">${escapeHtml(template.message)}</p>${details}
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr><td align="center" bgcolor="#f8a50e" style="background-color:#f8a50e;border-radius:6px;">
                        <a data-auth-action="primary" href="{{ .ConfirmationURL }}" style="display:inline-block;border:solid #f8a50e;border-width:14px 24px;border-radius:6px;background-color:#f8a50e;color:#0c2642;font-size:16px;line-height:22px;font-weight:700;text-align:center;text-decoration:none;mso-line-height-rule:exactly;">${escapeHtml(template.action)}</a>
                      </td></tr>
                    </table>
                    <p style="margin:20px 0 0;font-size:13px;line-height:21px;color:#5a6c84;">Button not working? <a data-auth-action="fallback" href="{{ .ConfirmationURL }}" style="color:#0c2642;text-decoration:underline;">Open the secure link</a>.</p>
                  </td></tr>
                  <tr><td style="padding-top:28px;border-bottom:1px solid #dce2ea;font-size:1px;line-height:1px;">&nbsp;</td></tr>
                  <tr><td style="padding-top:20px;">
                    <p style="margin:0;font-size:13px;line-height:21px;color:#5a6c84;">${escapeHtml(template.note)}</p>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr><td align="center" style="padding:20px 16px;">
              <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#5a6c84;">Your music. Your collaborators. Your SPLIT.</p>
              <p style="margin:0;font-size:12px;line-height:20px;color:#5a6c84;"><a href="${siteUrl}" style="color:#5a6c84;text-decoration:underline;">mysplit.co</a> &nbsp;&middot;&nbsp; <a href="mailto:${supportEmail}" style="color:#5a6c84;text-decoration:underline;">Contact SPLIT</a></p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export function getTemplatePatch() {
  return Object.fromEntries(templates.flatMap((template) => [
    [`mailer_subjects_${template.id}`, template.subject],
    [`mailer_templates_${template.id}_content`, renderEmail(template)],
  ]));
}
