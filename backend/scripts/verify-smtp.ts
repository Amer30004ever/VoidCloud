/**
 * verify-smtp.ts
 * --------------
 * Verifies the backend can authenticate against the configured SMTP server
 * (Outlook / Office 365 by default) and sends an optional test email.
 *
 * Reads env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM.
 *
 * Usage (inside the backend pod or with env vars set):
 *   npx ts-node --transpile-only scripts/verify-smtp.ts
 *   npx ts-node --transpile-only scripts/verify-smtp.ts you@example.com
 *
 * Exit codes:
 *   0 — verify() succeeded (and test email sent if a recipient was given)
 *   1 — missing env vars
 *   2 — verify() failed (auth / TLS / network)
 *   3 — sendMail() failed
 */
import 'dotenv/config';
import * as nodemailer from 'nodemailer';

function mask(v: string | undefined, keep = 2): string {
  if (!v) return '(unset)';
  if (v.length <= keep * 2) return '*'.repeat(v.length);
  return v.slice(0, keep) + '*'.repeat(v.length - keep * 2) + v.slice(-keep);
}

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || (user ? `AmerCloud <${user}>` : '');
  const to = process.argv[2] || user;

  console.log('── SMTP configuration ──');
  console.log(`  host : ${host ?? '(unset)'}`);
  console.log(`  port : ${port}`);
  console.log(`  user : ${user ?? '(unset)'}`);
  console.log(`  pass : ${mask(pass)}`);
  console.log(`  from : ${from || '(unset)'}`);
  console.log(`  to   : ${to ?? '(unset)'}\n`);

  if (!host || !user || !pass) {
    console.error('❌ Missing SMTP_HOST / SMTP_USER / SMTP_PASS — aborting.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: { ciphers: 'TLSv1.2' },
  });

  console.log('→ Verifying SMTP connection (auth + TLS) ...');
  try {
    await transporter.verify();
    console.log('✅ SMTP verify() succeeded — auth + TLS OK.\n');
  } catch (e: any) {
    console.error(`❌ SMTP verify() failed: ${e?.message ?? e}`);
    if (e?.response) console.error(`   server response: ${e.response}`);
    process.exit(2);
  }

  if (!to) {
    console.log('No recipient given and SMTP_USER unset — skipping test email.');
    process.exit(0);
  }

  console.log(`→ Sending test email to ${to} ...`);
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'AmerCloud SMTP test ✔',
      text: `This is a test email from the AmerCloud backend.\n\nHost: ${host}:${port}\nUser: ${user}\nTime: ${new Date().toISOString()}`,
      html: `<p>This is a test email from the <b>AmerCloud</b> backend.</p>
             <ul>
               <li>Host: <code>${host}:${port}</code></li>
               <li>User: <code>${user}</code></li>
               <li>Time: <code>${new Date().toISOString()}</code></li>
             </ul>`,
    });
    console.log(`✅ Test email accepted. messageId=${info.messageId}`);
    if (info.accepted?.length) console.log(`   accepted: ${info.accepted.join(', ')}`);
    if (info.rejected?.length) console.log(`   rejected: ${info.rejected.join(', ')}`);
    process.exit(0);
  } catch (e: any) {
    console.error(`❌ sendMail() failed: ${e?.message ?? e}`);
    if (e?.response) console.error(`   server response: ${e.response}`);
    process.exit(3);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(99);
});
