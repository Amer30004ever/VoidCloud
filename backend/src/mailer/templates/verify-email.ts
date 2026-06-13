export function verifyEmailTemplate(
  name: string,
  verifyUrl: string,
  ttlMinutes = 60 * 24,
) {
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b1020;padding:32px;color:#e2e8f0">
    <div style="max-width:560px;margin:0 auto;background:#111933;border:1px solid #1f2a4d;border-radius:16px;padding:32px">
      <h1 style="margin:0 0 16px;color:#a5f3fc">Welcome to AmerCloud, ${name} 👋</h1>
      <p style="line-height:1.6">Please confirm your email address to activate your account and start deploying.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${verifyUrl}" style="background:linear-gradient(90deg,#22d3ee,#d946ef);color:#0b1020;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600">Verify my email</a>
      </p>
      <p style="font-size:13px;color:#94a3b8">This link expires in ${Math.round(ttlMinutes / 60)} hours. If you didn't sign up, ignore this email.</p>
      <p style="font-size:12px;color:#64748b;word-break:break-all">${verifyUrl}</p>
    </div>
  </div>`;
  const text = `Welcome to AmerCloud, ${name}!\n\nVerify your email: ${verifyUrl}\n\nLink expires in ${Math.round(ttlMinutes / 60)} hours.`;
  return { html, text };
}
