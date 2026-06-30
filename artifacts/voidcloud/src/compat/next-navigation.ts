// @ts-nocheck
// Shim for next/navigation → wouter
import { useLocation, useRouter as useWouterRouter } from "wouter";

export function useRouter() {
  const [, navigate] = useLocation();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => window.history.back(),
    prefetch: () => {},
    refresh: () => window.location.reload(),
  };
}

export function usePathname() {
  const [location] = useLocation();
  return location;
}

export function useSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return [params] as const;
}

export function redirect(href: string) {
  window.location.href = href;
}

export function useParams() {
  // Returns empty object - individual route components handle params via wouter
  return {};
}
