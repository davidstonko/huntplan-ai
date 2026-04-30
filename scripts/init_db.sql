-- HuntPlan AI — Database Initialization
-- Run automatically by PostgreSQL Docker container on first start.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search / fuzzy matching
-- Note: pgvector will be created by the app on first connect if available
