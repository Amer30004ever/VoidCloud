# Lovable Agent Instructions for AmerCloud

## Project Overview

AmerCloud is a Kubernetes hosting platform for Egyptian developers and businesses. We provide managed Kubernetes with local payment support (Fawry/InstaPay) plus global Stripe. Target customers: Egyptian startups, SMEs, and freelance developers.

## Critical Rules - NEVER VIOLATE

### NEVER add these (they were past mistakes):
- ❌ Google or Microsoft logos in any "Trusted by" or "Integrations" section
- ❌ Any diagram showing pods (api-gateway, web-frontend, redis-cache, postgres-db, worker-queue, auth-service, cdn-edge, metrics)
- ❌ Inflated statistics - use "50+ Deployments in beta" NOT "500+ Deployments"
- ❌ Empty FAQ answers - all 8 questions must have complete answers
- ❌ Placeholder text like "Lorem ipsum" anywhere on landing page

### ALWAYS ensure:
- ✅ All 8 FAQ questions have complete, helpful answers
- ✅ Free trial card has tooltip explaining "After 7 days, deployments pause until upgrade. No auto-charge."
- ✅ Stats show accurate numbers for beta phase: "50+ Deployments in beta", "99.9% Uptime SLA", "<50ms Avg Response (Egypt)", "24/7 Support"
- ✅ Egyptian payment methods explicitly listed: Fawry, InstaPay, Vodafone Cash, Stripe

## File Organization Rules

### NEVER create files in these locations:
- Repository root (except config files: lovable.toml, AGENTS.md, package.json, README.md)
- Any folder outside frontend/ or backend/

### ALWAYS put files in correct locations:
- Landing page components → `/frontend/src/components/landing/`
- UI components (buttons, inputs, cards) → `/frontend/src/components/ui/`
- App pages → `/frontend/src/app/`
- Backend modules → `/backend/src/modules/`
- Backend controllers → `/backend/src/controllers/`
- Backend services → `/backend/src/services/`

### Naming conventions:
- Use kebab-case for file names: `my-component.tsx`, `user-service.ts`
- Use PascalCase for component names: `MyComponent`, `UserProfile`
- Use camelCase for variables and functions: `getUserData`, `isLoading`

## Coding Standards

### TypeScript rules:
- Enable strict mode
- NEVER use `any` type - use `unknown` and narrow the type
- Always define interfaces for props and state
- Use proper return types for functions

### React/Next.js rules:
- Prefer named exports over default exports
- Use functional components with hooks
- Add proper loading and error states
- Use Tailwind CSS for styling - no inline styles

### Backend rules:
- Always validate input with class-validator
- Always handle errors with try/catch
- Never expose sensitive data in responses
- Use DTOs for data transformation

## What the App Does

### Core features:
1. Kubernetes deployment engine - users can deploy containers with one click
2. Payment processing - Stripe (global), Fawry (Egyptian cards + 3000+ locations), InstaPay (Egyptian bank transfers)
3. User dashboard - monitor CPU, RAM, storage usage in real-time
4. Authentication - email/password, 2FA, GitHub OAuth, Google OAuth
5. Backups - daily automated backups with one-click restore

### Current status:
- Phase 2 complete - all core features implemented
- Landing page needs trust signals fixed (no fake logos)
- In beta - accurate stats should reflect "in beta"

## History of Changes (For Context)

### Completed fixes (do not undo):
- 2026-06-12: Added password show/hide toggle to login/register forms
- 2026-06-12: Created lovable.toml for proper dev server configuration
- 2026-06-12: Removed fake Google/Microsoft logos from earlier version (DO NOT RE-ADD)
- 2026-06-12: Removed pod visualization diagram (DO NOT RE-ADD)

### Pending fixes (you may be asked to do):
- Add all 8 FAQ answers
- Fix stats to show "50+ in beta"
- Add free trial tooltip
- Add comparison table (AmerCloud vs AWS vs Vercel)
- Add use cases section
- Add live status indicator

## Locked Files - NEVER MODIFY WITHOUT PERMISSION

The following files are locked and should never be modified unless explicitly asked:

1. `/frontend/src/components/landing/Integrations.tsx` - Contains integration logos
2. `/frontend/src/components/landing/Pricing.tsx` - Contains pricing plans
3. `/lovable.toml` - Dev server configuration
4. `/AGENTS.md` - This file itself

If I need to modify these, I will explicitly say "unlock [filename]" first.

## How to Respond

When I ask for changes:
1. First check if any locked files are affected
2. Review the "NEVER" rules above before implementing
3. If something violates a rule, warn me before proceeding
4. Keep file organization rules in mind when creating new files
5. Follow coding standards automatically

## Success Criteria

A change is successful when:
- No "NEVER" rules are violated
- File organization rules are followed
- No placeholder text remains
- All links work (especially Sign In → /amercloud/login, Start Free → /amercloud/register)
- No fake trust signals exist
