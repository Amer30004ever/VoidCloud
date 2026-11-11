import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a deploy-webhook signature. Accepts the GitHub form
 * (`sha256=<hex>` in X-Hub-Signature-256), a bare hex digest, or GitLab's
 * shared-token header (X-Gitlab-Token) compared in constant time.
 */
export function verifyDeploySignature(opts: {
  secret: string;
  rawBody: string;
  signature?: string | null;
  gitlabToken?: string | null;
}): boolean {
  const { secret, rawBody, signature, gitlabToken } = opts;
  if (!secret) return false;
  if (gitlabToken) return safeEqual(gitlabToken, secret);
  if (!signature) return false;
  const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(provided, expected);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Extracts the branch from a GitHub/GitLab push ref ("refs/heads/main" -> "main"). */
export function branchFromRef(ref?: string | null): string | null {
  if (!ref) return null;
  return ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
}
