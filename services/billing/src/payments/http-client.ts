import { BadRequestException } from '@nestjs/common';

/**
 * Real fetch-based HTTP client for the live payment gateways.
 *
 * Until Prompt 0.16 the gateways were wired to a stub that threw on every
 * call, which is why no real Paymob sandbox transaction could ever be made.
 * This client performs actual HTTP, and is only used when the gateway is
 * fully configured; unit tests keep injecting their own fake.
 */
export interface FetchLike {
  (url: string, init?: any): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
}

export interface LiveHttpOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Extra headers applied to every request (e.g. Authorization). */
  headers?: Record<string, string>;
}

export function makeLiveHttp(options: LiveHttpOptions = {}) {
  const doFetch: FetchLike =
    options.fetchImpl ?? ((globalThis as any).fetch as FetchLike);
  const timeoutMs = options.timeoutMs ?? 20_000;

  const request = async <T>(
    method: 'GET' | 'POST',
    url: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<T> => {
    if (!doFetch) {
      throw new BadRequestException('No fetch implementation available');
    }
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
    try {
      const res = await doFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
          ...(headers ?? {}),
        },
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        signal: controller?.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new BadRequestException(
          `Gateway ${method} ${url} failed (${res.status}): ${text.slice(0, 300)}`,
        );
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return {
    post: <T>(url: string, body?: any, headers?: Record<string, string>) =>
      request<T>('POST', url, body, headers),
    get: <T>(url: string, headers?: Record<string, string>) =>
      request<T>('GET', url, undefined, headers),
  };
}
