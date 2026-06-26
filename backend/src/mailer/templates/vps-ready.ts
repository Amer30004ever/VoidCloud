export function vpsReadyEmail(opts: {
  name: string;
  vpsName: string;
  ipv4: string;
  rootPassword?: string;
  dashboardUrl: string;
}) {
  const safeName = (opts.name || 'there').replace(/[<>]/g, '');
  const pwBlock = opts.rootPassword
    ? `<p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Initial root password (shown once):</p>
       <p style="margin:0 0 16px;font-family:ui-monospace,Menlo,Consolas,monospace;background:#0a0a0a;border:1px solid #1f2937;border-radius:8px;padding:10px;color:#67e8f9;word-break:break-all">${opts.rootPassword}</p>`
    : '';
  const html = `<!doctype html>
<html><body style="margin:0;background:#0a0a0a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0a0a0a;font-size:24px;font-weight:700">☁</div>
      <h1 style="margin:12px 0 0;font-size:22px;color:#fff">VoidCloud</h1>
    </div>
    <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px">
      <h2 style="margin:0 0 12px;font-size:20px;color:#fff">Your VPS is ready 🎉</h2>
      <p style="margin:0 0 16px;line-height:1.6;color:#cbd5e1">Hi ${safeName}, <b>${opts.vpsName}</b> is now running and reachable.</p>
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">IPv4 address:</p>
      <p style="margin:0 0 16px;font-family:ui-monospace,Menlo,Consolas,monospace;background:#0a0a0a;border:1px solid #1f2937;border-radius:8px;padding:10px;color:#67e8f9">${opts.ipv4}</p>
      ${pwBlock}
      <p style="text-align:center;margin:28px 0">
        <a href="${opts.dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#22d3ee,#d946ef);color:#0a0a0a;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Open dashboard →</a>
      </p>
      <p style="margin:0;font-size:12px;color:#64748b">For security, change the root password and disable password SSH once you've added your key.</p>
    </div>
    <p style="text-align:center;font-size:12px;color:#64748b;margin-top:16px">© ${new Date().getFullYear()} VoidCloud · Support: support.voidcloud@gmail.com</p>
  </div>
</body></html>`;
  const text = `Your VPS "${opts.vpsName}" is ready.\nIPv4: ${opts.ipv4}${opts.rootPassword ? `\nRoot password (shown once): ${opts.rootPassword}` : ''}\nDashboard: ${opts.dashboardUrl}`;
  return { html, text };
}
