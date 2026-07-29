# WhatsApp Broadcast — Transport Risk Decision

## Decision (2026-07-22)

Broadcasts are sent through **openwa** (unofficial WhatsApp automation library), **not** Meta's official WhatsApp Business Cloud API.

## Accepted Risk

Bulk marketing-style messaging through openwa carries a **known, accepted risk**:
- Meta's anti-spam detection may flag outbound traffic patterns
- Tenant WhatsApp numbers may receive temporary or permanent restrictions/bans
- Rate limiting (implemented at 2s per message) reduces but does **not** eliminate this risk

## Why This Tradeoff Was Accepted

- Prompt 2.5 explicitly asked for broadcast capability using the existing openwa transport
- The feature is beta-labeled in the UI with an explicit warning
- For a solo founder building a real product, this delivers the requested functionality now
- The path to the official API is documented and can be pursued when customer volume justifies the integration cost

## Path to Official API (Future)

When broadcast volume or customer requirements justify it:
1. Register for Meta WhatsApp Business Platform
2. Migrate `sendWhatsApp()` in `whatsapp-broadcast.consumer.ts` to call Meta's `/v1/messages` endpoint
3. Replace placeholder-style templates with Meta-pre-approved message templates
4. Remove the beta warning once on the official transport

## Scope

This risk acceptance applies ONLY to the broadcast feature in `services/crm/src/whatsapp-broadcast/`.
It does NOT apply to:
- One-to-one CRM conversations (existing flow, lower volume)
- Transactional notifications (should use official API when available)
