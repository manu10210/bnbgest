-- Phase 2.1: add advanced JSON settings fields for per-user persistence
ALTER TABLE "user_settings"
ADD COLUMN IF NOT EXISTS "notificationsMatrix" JSONB,
ADD COLUMN IF NOT EXISTS "notificationContacts" JSONB,
ADD COLUMN IF NOT EXISTS "customAlerts" JSONB,
ADD COLUMN IF NOT EXISTS "securitySessions" JSONB,
ADD COLUMN IF NOT EXISTS "securityApiKeys" JSONB,
ADD COLUMN IF NOT EXISTS "backupHistory" JSONB;
