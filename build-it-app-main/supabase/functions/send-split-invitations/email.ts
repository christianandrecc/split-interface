export type InvitationEmail = { id: string; splitId: string; to: string; workTitle: string; inviterName: string };
export const FROM = "SPLIT <notifications@mail.mysplit.co>";
const SITE = "https://www.mysplit.co/";
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function invitationEmail(job: InvitationEmail) {
  const url = `${SITE}?split=${encodeURIComponent(job.splitId)}`;
  const title = escape(job.workTitle);
  const inviter = escape(job.inviterName);
  return {
    from: FROM,
    to: [job.to],
    reply_to: "xtiancarrera@gmail.com",
    subject: "You have a SPLIT invitation",
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f5f6f8;color:#102d48;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${inviter} invited you to review a split.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce2e9;border-radius:8px">
<tr><td style="padding:32px 28px 24px"><img src="${SITE}split-android-chrome-512x512.png" width="44" height="44" alt="" style="vertical-align:middle;margin-right:10px"><strong style="font-size:24px;vertical-align:middle">SPLIT</strong></td></tr>
<tr><td style="padding:0 28px 32px"><h1 style="font-size:26px;line-height:1.3;margin:0 0 18px">You’re invited.</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px">${inviter} invited you to collaborate on a split sheet.</p>
<p style="font-size:20px;font-weight:bold;line-height:1.4;overflow-wrap:anywhere;margin:0 0 24px">${title}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#ffa500" style="border-radius:6px"><a href="${url}" style="display:inline-block;padding:16px 22px;color:#102d48;font-size:16px;font-weight:bold;text-decoration:none">Review invitation</a></td></tr></table>
<p style="font-size:14px;line-height:1.6;color:#61718a;margin:24px 0 0">Sign in or create your SPLIT account to review the invitation. You can accept or decline inside SPLIT. Opening this email does not accept the invitation or sign an agreement.</p>
<p style="font-size:12px;line-height:1.6;color:#61718a;margin:20px 0 0;word-break:break-all">Button not working? <a href="${url}" style="color:#102d48">Open your invitation</a></p>
</td></tr><tr><td style="border-top:1px solid #e6e9ee;padding:20px 28px;font-size:12px;line-height:1.6;color:#61718a">Unexpected invitation? You can ignore it or <a href="mailto:xtiancarrera@gmail.com" style="color:#102d48">contact SPLIT</a>.</td></tr>
</table></td></tr></table></body></html>`,
    text: `${job.inviterName} invited you to collaborate on "${job.workTitle}".\n\nReview invitation: ${url}\n\nSign in or create your SPLIT account to review, accept or decline. Opening this email does not accept the invitation or sign an agreement.\n\nUnexpected invitation? Ignore it or contact xtiancarrera@gmail.com.`,
  };
}
