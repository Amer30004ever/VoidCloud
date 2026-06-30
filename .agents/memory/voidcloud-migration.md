---
name: VoidCloud migration patterns
description: Lessons from migrating VoidCloud Next.js monorepo to Vite+React in pnpm workspace
---

# VoidCloud Migration

**Why:** Large Next.js app with monorepo layout (frontend/ subdirectory). fullstack_copy_frontend.sh could not auto-detect client dir.

**How to apply:** For future monorepo imports where client is in a subdirectory, pass `--client-dir <path>` explicitly to fullstack_copy_frontend.sh.

## Key patterns

- Created compat shims in `src/compat/`: next-navigation.ts (useRouter→wouter), next-link.tsx, next-image.tsx
- Batch sed replaced all `next/*` imports in 59 files (navigation, link, image, font)
- `"use client"` directives removed via `sed -i '/^"use client";/d'`
- `NEXT_PUBLIC_*` → `import.meta.env.VITE_*` in constants.ts and component files
- `next-themes` in sonner.tsx replaced with custom ThemeContext
- `useParams` from next/navigation replaced with wouter's own `useParams`
- The app's layout.tsx is not needed in Vite — replaced with pass-through stub
- Providers wrapped in App.tsx directly (QueryClient, ThemeProvider, LocaleProvider, etc.)
- All 122 pages converted to lazy-loaded wouter Route entries in App.tsx

## Dependencies added (missing from scaffold)
- axios, socket.io-client, xterm, xterm-addon-fit, xterm-addon-web-links, @reduxjs/toolkit, react-redux
