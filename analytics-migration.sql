-- Marine Fix Analytics Migration
-- Adds the analytics event table only.
-- Does not modify or delete any existing Marine Fix tables/data.

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android')),
  event TEXT NOT NULL CHECK (event IN ('visit', 'session', 'install')),
  path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_platform
  ON analytics_events(visitor_id, platform);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created_at
  ON analytics_events(event, created_at);
