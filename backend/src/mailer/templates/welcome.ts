export function welcomeEmail(name: string, dashboardUrl: string) {
  const safeName = (name || 'there').replace(/[<>]/g, '');
  const html = `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0a0a0a;font-size:24px;font-weight:700">☁</div>
      <h1 style="margin:12px 0 0;font-size:22px;color:#fff">Welcome to AmerCloud</h1>
    </div>
    <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px">
      <h2 style="margin:0 0 12px;font-size:20px;color:#fff">Hi ${safeName}, your account is ready 🚀</h2>
      <p style="margin:0 0 16px;line-height:1.6;color:#cbd5e1">Your 7-day free trial is now active. Deploy your first VPS in under a minute — no credit card needed.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0a0a0a;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Open your dashboard →</a>
      </p>
      <p style="margin:0;font-size:13px;color:#94a3b8">After 7 days, your VPS instances pause until you upgrade. No auto-charge.</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#64748b;margin-top:16px">© ${new Date().getFullYear()} AmerCloud · Support: nova-cloud-2026@outlook.com</p>
  </div>
</body></html>`;
  const text = `Welcome to AmerCloud, ${safeName}!\n\nYour 7-day free trial is active. Open your dashboard:\n${dashboardUrl}`;
  return { html, text };
}
