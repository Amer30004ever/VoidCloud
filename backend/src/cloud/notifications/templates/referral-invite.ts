export interface ReferralInviteData {
  inviterName: string;
  inviteeEmail: string;
  referralLink: string;
  discountCode?: string;
}

export function referralInviteEmail(data: ReferralInviteData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '[Void Cloud] Your friend invited you to try Void Cloud';
  const text = `${data.inviterName} invited you to try Void Cloud.

Sign up with this link to get started${data.discountCode ? ` and use code ${data.discountCode} for a discount` : ''}:
${data.referralLink}

Void Cloud — Kubernetes hosting built for Egyptian developers.`;

  const html = `<!doctype html>
<html><body style="font-family:system-ui,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:22px">You've been invited to Void Cloud ☁️</h1>
    <p style="line-height:1.6;color:#cbd5e1"><strong>${escapeHtml(data.inviterName)}</strong> thinks you'd love Void Cloud — managed Kubernetes hosting built for Egyptian developers, with local payments (Fawry, InstaPay) and global Stripe.</p>
    ${data.discountCode ? `<p style="line-height:1.6;color:#cbd5e1">Use code <code style="background:#0f172a;padding:4px 8px;border-radius:6px">${escapeHtml(data.discountCode)}</code> at signup for a discount.</p>` : ''}
    <p style="margin:24px 0">
      <a href="${escapeAttr(data.referralLink)}" style="display:inline-block;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0f172a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Claim your invite</a>
    </p>
    <p style="font-size:12px;color:#94a3b8">If the button doesn't work, copy this link: ${escapeHtml(data.referralLink)}</p>
  </div>
</body></html>`;
  return { subject, html, text };
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
      c
      ]!,
  );
}
function escapeAttr(s: string) {
  return escapeHtml(s);
}
