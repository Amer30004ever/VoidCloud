export function passwordResetEmail(
  name: string,
  resetUrl: string,
  expiresInMinutes: number,
) {
  const safeName = (name || 'there').replace(/[<>]/g, '');
  const html = `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0a0a0a;font-size:24px;font-weight:700">☁</div>
      <h1 style="margin:12px 0 0;font-size:22px;color:#fff">AmerCloud</h1>
    </div>
    <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px">
      <h2 style="margin:0 0 12px;font-size:20px;color:#fff">Reset your password</h2>
      <p style="margin:0 0 16px;line-height:1.6;color:#cbd5e1">Hi ${safeName}, we received a request to reset your AmerCloud password. Click the button below to choose a new one. This link expires in ${expiresInMinutes} minutes.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0a0a0a;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Reset password →</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">If the button doesn't work, paste this URL into your browser:</p>
      <p style="margin:0;font-size:12px;color:#67e8f9;word-break:break-all">${resetUrl}</p>
      <hr style="border:none;border-top:1px solid #1f2937;margin:24px 0" />
      <p style="margin:0;font-size:12px;color:#64748b">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#64748b;margin-top:16px">© ${new Date().getFullYear()} AmerCloud · Support: nova-cloud-2026@outlook.com</p>
  </div>
</body></html>`;
  const text = `AmerCloud password reset\n\nHi ${safeName},\n\nReset your password (link expires in ${expiresInMinutes} minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;
  return { html, text };
}
