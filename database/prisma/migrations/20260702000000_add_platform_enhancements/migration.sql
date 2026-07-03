-- ─────────────────────────────────────────────────────────────
-- Migration: Platform Enhancement Models
-- Date:      2026-07-02
-- Adds:
--   proxmox_clusters        — Proxmox host registry (CPU/RAM/disk usage)
--   service_health_logs     — Timestamped health snapshots per microservice
--   whatsapp_broadcasts     — WhatsApp broadcast campaign records
--   platform_settings       — Simple key-value platform config
--   ip_block_list           — IP-based blocking / allow-list
--
-- Column naming convention: camelCase (quoted) to match Prisma defaults.
-- ─────────────────────────────────────────────────────────────

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── proxmox_clusters ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "proxmox_clusters" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT         NOT NULL,
  "host"        TEXT         NOT NULL,
  "port"        INTEGER      NOT NULL DEFAULT 8006,
  "username"    TEXT         NOT NULL DEFAULT 'root@pam',
  "tokenId"     TEXT,
  "tokenSecret" TEXT,
  "status"      TEXT         NOT NULL DEFAULT 'ACTIVE',
  "cpuTotal"    INTEGER      NOT NULL DEFAULT 0,
  "ramTotal"    BIGINT       NOT NULL DEFAULT 0,
  "diskTotal"   BIGINT       NOT NULL DEFAULT 0,
  "cpuUsed"     INTEGER      NOT NULL DEFAULT 0,
  "ramUsed"     BIGINT       NOT NULL DEFAULT 0,
  "diskUsed"    BIGINT       NOT NULL DEFAULT 0,
  "vmCount"     INTEGER      NOT NULL DEFAULT 0,
  "nodeCount"   INTEGER      NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "proxmox_clusters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "proxmox_clusters_status_idx" ON "proxmox_clusters" ("status");

-- ── service_health_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "service_health_logs" (
  "id"               TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "serviceName"      TEXT         NOT NULL,
  "status"           TEXT         NOT NULL,   -- UP | DEGRADED | DOWN
  "responseTimeMs"   INTEGER,
  "errorMessage"     TEXT,
  "uptimePercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "checkedAt"        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "service_health_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "service_health_logs_serviceName_idx" ON "service_health_logs" ("serviceName");
CREATE INDEX IF NOT EXISTS "service_health_logs_checkedAt_idx"   ON "service_health_logs" ("checkedAt");
CREATE INDEX IF NOT EXISTS "service_health_logs_status_idx"      ON "service_health_logs" ("status");

-- ── whatsapp_broadcasts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "whatsapp_broadcasts" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "createdBy"      TEXT         NOT NULL,
  "tenantId"       TEXT,
  "templateId"     TEXT,
  "templateName"   TEXT,
  "messageBody"    TEXT         NOT NULL,
  "segment"        TEXT         NOT NULL DEFAULT 'all',
  "status"         TEXT         NOT NULL DEFAULT 'PENDING',
  "sentCount"      INTEGER      NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER      NOT NULL DEFAULT 0,
  "failedCount"    INTEGER      NOT NULL DEFAULT 0,
  "metadata"       JSONB,
  "sentAt"         TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "whatsapp_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_createdBy_idx" ON "whatsapp_broadcasts" ("createdBy");
CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_status_idx"    ON "whatsapp_broadcasts" ("status");
CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_createdAt_idx" ON "whatsapp_broadcasts" ("createdAt");

-- ── platform_settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "key"         TEXT         NOT NULL,
  "value"       TEXT         NOT NULL DEFAULT '',
  "valueType"   TEXT         NOT NULL DEFAULT 'string',
  "description" TEXT,
  "updatedBy"   TEXT,
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "platform_settings" ("key", "value", "valueType", "description") VALUES
  ('maintenance_enabled',  'false',                                'boolean', 'When true, only Super Admins can access the platform'),
  ('maintenance_message',  'Platform is undergoing maintenance.',  'string',  'Banner message shown during maintenance'),
  ('maintenance_end_time', '',                                     'string',  'ISO datetime estimate for maintenance end'),
  ('platform_name',        'VoidCloud',                            'string',  'Display name of the platform'),
  ('support_email',        'support@voidcloud.cc.cd',              'string',  'Public support email'),
  ('grafana_url',          'https://grafana.voidcloud.cc.cd',      'string',  'Grafana dashboard URL'),
  ('rate_limit_per_minute','100',                                  'number',  'Default rate limit per IP per minute'),
  ('max_login_attempts',   '5',                                    'number',  'Failed login attempts before lockout'),
  ('session_timeout_hours','168',                                  'number',  'JWT session timeout in hours')
ON CONFLICT ("key") DO NOTHING;

-- ── ip_block_list ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ip_block_list" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "ipAddress"   TEXT         NOT NULL,
  "reason"      TEXT,
  "blockedBy"   TEXT,
  "tenantId"    TEXT,
  "isPermanent" BOOLEAN      NOT NULL DEFAULT false,
  "expiresAt"   TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "ip_block_list_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "ip_block_list_ip_unique"  UNIQUE ("ipAddress")
);

CREATE INDEX IF NOT EXISTS "ip_block_list_ipAddress_idx" ON "ip_block_list" ("ipAddress");
CREATE INDEX IF NOT EXISTS "ip_block_list_createdAt_idx" ON "ip_block_list" ("createdAt");
