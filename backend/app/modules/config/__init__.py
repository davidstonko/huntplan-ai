"""
Config module — runtime configuration the mobile app fetches on boot.

Currently exposes the Mapbox access token. Adding new fields (RevenueCat
public key, analytics endpoint, feature-flag bundle) follows the same
pattern: a typed Pydantic schema in routes.py + an env-var passthrough.

Why backend-served config:
    - Token rotation without an app update — bump the env var on Render
      and every client picks up the new token within 24h (cache TTL).
    - Per-region / per-tier token strategies later (e.g., Pro users get
      a higher-quota token).
    - Centralized place to revoke a leaked token without rebuilding.

Added 2026-04-27.
"""
