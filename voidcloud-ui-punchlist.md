# VoidCloud UI/UX Audit — Phase 1 Punch-List (browser-verified)

Method: Playwright sweep of 33 routes across SUPER_ADMIN / ADMIN / AGENT / USER (route list taken from
`voidcloud-ui-verification-backlog.md` Batches 1–4), at 1280px and 390px, with a mocked session
(`/auth/me` returns the role, all other API calls return empty payloads) so authenticated pages render.
Screenshots: `/tmp/browser/audit/shots/`. Raw metrics: `/tmp/browser/audit/auth_report.json`.

## CRITICAL — looks broken / blocks usability

| # | Page(s) | Issue |
|---|---------|-------|
| C1 | Every admin page (sidebar + KPI cards), business dashboard, admin dashboard | Emoji icons render as tofu boxes (`\u25a1`) — sidebar "Users/Plans/Billing/WhatsApp/Transactions", KPI card icons, the Arabic language toggle. Emoji glyphs are used as the icon system with no font fallback. Reads as a broken build. |
| C2 | All 12 admin routes + dash routes at 390px | No responsive behavior: fixed sidebar never collapses, page scrollWidth 481–883px vs 390px viewport. Content is horizontally clipped (tables cut mid-column). Mobile is effectively unusable. |
| C3 | `/voidcloud/agent/dashboard`, `/conversations`, `/leads` | No app shell at all: no sidebar, no topbar, no page padding (H1 sits at x=0), pure `#000` background instead of the `vc-page` theme used everywhere else. Looks like a different product. |
| C4 | `/voidcloud/dashboard/*` (vps, billing, crm, webhooks, reports, domains, images, apps, addons, settings) | The onboarding wizard ("Welcome to Void Cloud") hijacks **every** tenant route, not just `/onboarding`. The requested page never renders while onboarding is incomplete, with no skip visible on the page itself. |
| C5 | `/voidcloud/dashboard` (home), `/dashboard/wallet`, `/dashboard/referrals`, `/dashboard/analytics`, `/admin/monitoring`, `/voidcloud/user/dashboard` | Hard-crash to the ErrorBoundary ("This page couldn't load") when an endpoint returns an unexpected shape. No per-widget error isolation — one bad response blanks the whole page. |
| C6 | Admin shell (all admin pages) | Sidebar footer: the avatar chip overlaps and clips the "Log out" label ("g out" visible). |

## IMPORTANT — inconsistent / unprofessional

| # | Page(s) | Issue |
|---|---------|-------|
| I1 | All `/voidcloud/**` pages | Zero adoption of the shared `@workspace/ui-kit` (`PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `StatusBadge`, `Button`). 0 of 40+ VoidCloud pages import it; only the legacy `/app/*` pages do. Every page re-rolls its own header/empty/card markup. |
| I2 | Cross-page | H1 size drifts by page: 24px (clusters, error state), 30px (users, pods, admin dashboard, agent), 36px (business dashboard), 48px (help). No type scale. |
| I3 | Cross-page | Button styling drifts: 6+ distinct height/radius/font combos on a single page (26/30/32/36/38/40/42px heights; 6/8/10/14px radii). Primary CTA is a gradient on Users but a flat outline on Business Dashboard. |
| I4 | Cross-page | Card radius drifts: 8px, 10px, 14px, 18px coexist within the same view (admin dashboard/clusters/billing). |
| I5 | Every list/table page (users, clusters, pods, billing, audit, incidents, abuse, plans) | **No loading states at all** — 0 skeletons, 0 spinners detected on any page. Content pops in from blank. |
| I6 | admin users/clusters/pods/billing/audit, agent leads/conversations | Empty states are a bare grey sentence ("No users found.", "No leads assigned to you.", "No node data available.") — no icon, no explanation, no primary action. `ui-kit/empty-state` already exists and is unused. |
| I7 | `/voidcloud/business/dashboard` | Renders with no sidebar/topbar — the ADMIN role has no navigation shell, so it's a dead-end page. |
| I8 | `/voidcloud/admin/dashboard` | Inconsistent empty-value representation in the same KPI row: `0`, `—`, and `0 USD · 0 EGP`. |
| I9 | Admin pages | Secondary metadata ("Last updated: 4:10:19 PM"), table headers, and KPI labels all sit in the same low-contrast grey at near-identical size — no label/body/meta hierarchy; table header contrast is below comfortable reading on the dark surface. |
| I10 | Admin dashboard / clusters / billing | Panel headings are H2 at 16px and 18px inconsistently, sometimes smaller than body emphasis text. |

## POLISH — deferred to a later pass

- P1 Floating "AI" bubble overlaps the sidebar logout chip on narrow desktop.
- P2 Huge empty vertical space below the fold on low-density pages (admin dashboard, users, agent).
- P3 Breadcrumb in the topbar shows the raw path (`/voidcloud/admin/users`) instead of readable crumbs.
- P4 No hover/focus-visible treatment consistency on table rows and icon buttons.
- P5 `+ New user` label style (leading `+`) differs from every other action button.
- P6 Arabic toggle has no flag/label fallback when the emoji fails.

## Suggested Phase 2 order (5–8 items per batch)

- **Batch A (Critical):** C1, C6, C3, C7-shell for agent = adopt one `AppShell` from ui-kit; C2 responsive sidebar.
- **Batch B (Critical):** C4 onboarding gating, C5 per-widget error isolation via `ui-kit/error-state`.
- **Batch C (Important):** I1/I2/I3/I4 — add `PageHeader`, `Button`, `Card` tokens to ui-kit and migrate admin pages.
- **Batch D (Important):** I5/I6 — `ui-kit` skeleton + empty-state rollout across list pages.
- **Batch E (Important):** DONE — I7 business shell (AppShell), I8 KPI value normalization (single em-dash empty value, lucide icons, revenue split into value + sub-line), I9/I10 type scale (`vc-h1`/`vc-h2`/`vc-label`/`vc-meta`) applied to admin + business dashboards.
- Note: C6 "logout chip overlap" is the Next.js dev-mode indicator badge, not app markup — no production impact.
