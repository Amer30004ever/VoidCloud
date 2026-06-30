---
name: landing-page-rules
description: Rules for modifying the AmerCloud landing page - prevents common mistakes
---

# Landing Page Modification Rules

## When to use this skill

Use this skill whenever making ANY change to the landing page (frontend/src/app/page.tsx or any component in frontend/src/components/landing/).

## Critical Never-Do List

### 1. Trust/Integrations Section
- NEVER add Google, Microsoft, Amazon, or any large tech company logo
- ONLY show logos for services we ACTUALLY integrate with: Stripe, Fawry, InstaPay, GitHub, Docker, Kubernetes
- Section title should be "Integrated with" NOT "Trusted by"

### 2. Visual Elements
- NEVER add the pod diagram showing pods with labels like "api-gateway", "web-frontend", "redis-cache"
- This diagram was removed because it confused users

### 3. Statistics
- NEVER claim "500+ Deployments"
- ALWAYS use "50+ Deployments in beta" (accurate for launch phase)
- If you don't know the exact number, ask me first

### 4. FAQ Section
- ALWAYS ensure ALL 8 questions have complete answers
- NEVER leave an answer empty or as "..."
- The 8 questions are:
  1. What's the difference between AmerCloud and AWS/Vercel?
  2. Do I need to know Kubernetes?
  3. How does billing work in Egypt?
  4. Can I use my own domain?
  5. Is my data backed up?
  6. Can I migrate away if needed?
  7. What happens after the 7-day free trial?
  8. Is there a team/organization plan?

### 5. Free Trial
- ALWAYS add tooltip explaining: "After 7 days, deployments pause until upgrade. No auto-charge."
- ALWAYS add footnote: "* After 7 days, deployments pause until upgrade. No auto-charge."

## File Locations Reference

| Component | File Path |
|-----------|-----------|
| Hero section | `/frontend/src/components/landing/Hero.tsx` |
| Features grid | `/frontend/src/components/landing/Features.tsx` |
| Pricing cards | `/frontend/src/components/landing/Pricing.tsx` |
| FAQ accordion | `/frontend/src/components/landing/FAQ.tsx` |
| Stats counters | `/frontend/src/components/landing/Stats.tsx` |
| Trust/Integrations | `/frontend/src/components/landing/Integrations.tsx` |
| Footer | `/frontend/src/components/landing/Footer.tsx` |
| Navigation | `/frontend/src/components/landing/Navbar.tsx` |

## Quick Fix Commands

When I say "fix the landing page", do:
1. Check Integrations.tsx - remove any Google/Microsoft logos
2. Check Stats.tsx - ensure "50+ Deployments in beta" not "500+"
3. Check FAQ.tsx - ensure all 8 answers are complete
4. Check Pricing.tsx - add tooltip and footnote to free trial
5. Remove any pod diagrams if present

## Pre-modification Checklist

Before modifying any landing page file:
- [ ] Am I about to add any fake logos? (NO)
- [ ] Am I about to add a pod diagram? (NO)
- [ ] Are stats accurate for beta? (YES, "50+ in beta")
- [ ] Will I leave any FAQ empty? (NO)
