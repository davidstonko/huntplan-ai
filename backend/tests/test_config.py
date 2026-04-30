"""
Runtime config endpoint tests.

Covers:
  - GET /api/v1/config/mapbox-token returns the configured token
  - GET /api/v1/config/runtime returns the bundle shape
  - 503 when MAPBOX_ACCESS_TOKEN is unset
"""

from unittest.mock import patch

import pytest

from app.config import settings


class TestMapboxToken:
    """Test the /api/v1/config/mapbox-token endpoint."""

    async def test_returns_configured_token(self, async_client):
        """When env var is set, endpoint returns it."""
        with patch.object(settings, "mapbox_access_token", "pk.test_token_xyz"):
            response = await async_client.get("/api/v1/config/mapbox-token")

        assert response.status_code == 200
        data = response.json()

        assert data["token"] == "pk.test_token_xyz"
        assert "issued_at" in data
        assert data["suggested_refresh_seconds"] == 86400

    async def test_503_when_unset(self, async_client):
        """When env var is unset, endpoint returns 503."""
        with patch.object(settings, "mapbox_access_token", None):
            response = await async_client.get("/api/v1/config/mapbox-token")

        assert response.status_code == 503
        data = response.json()
        assert "MAPBOX_ACCESS_TOKEN" in data["detail"]


class TestRuntimeConfig:
    """Test the /api/v1/config/runtime bundle endpoint."""

    async def test_returns_bundle_shape(self, async_client):
        """Bundle endpoint returns all expected fields."""
        with patch.object(settings, "mapbox_access_token", "pk.bundle_test"):
            response = await async_client.get("/api/v1/config/runtime")

        assert response.status_code == 200
        data = response.json()

        # Required fields
        assert data["mapbox_token"] == "pk.bundle_test"
        assert "mapbox_token_issued_at" in data
        assert data["mapbox_token_suggested_refresh_seconds"] == 86400
        assert "server_time" in data

    async def test_bundle_handles_missing_token(self, async_client):
        """Bundle returns null token gracefully when env var unset."""
        with patch.object(settings, "mapbox_access_token", None):
            response = await async_client.get("/api/v1/config/runtime")

        # Bundle uses Optional[str] so 200 with null is the contract.
        assert response.status_code == 200
        data = response.json()
        assert data["mapbox_token"] is None
        assert "server_time" in data
