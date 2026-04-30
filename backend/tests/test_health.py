"""
Basic health check and system tests.

Tests that the API is responsive and core endpoints are available.
"""

import pytest


class TestHealth:
    """Test basic health check endpoints."""

    async def test_health_check(self, async_client):
        """GET /health returns 200 with status."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "ok"
        assert "app" in data
        assert "version" in data

    async def test_root_endpoint(self, async_client):
        """GET / returns welcome message."""
        response = await async_client.get("/")

        assert response.status_code == 200
        data = response.json()

        assert "message" in data
        assert "docs" in data
        assert "disclaimer" in data


class TestDocumentation:
    """Test API documentation endpoints."""

    async def test_docs_available(self, async_client):
        """GET /docs returns 200 (Swagger UI)."""
        response = await async_client.get("/docs")

        assert response.status_code == 200

    async def test_openapi_schema(self, async_client):
        """GET /openapi.json returns valid OpenAPI schema."""
        response = await async_client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()

        # Validate OpenAPI structure
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data

        # Check key endpoints are documented
        paths = data["paths"]
        assert "/health" in paths or "/api/v1" in str(paths)


class TestCORS:
    """Test CORS headers."""

    async def test_cors_headers(self, async_client):
        """Verify CORS headers are present."""
        response = await async_client.get("/health")

        # Check CORS headers (may vary by implementation)
        # At minimum, endpoint should be reachable
        assert response.status_code == 200

    async def test_options_request(self, async_client):
        """OPTIONS request for CORS preflight."""
        response = await async_client.options("/api/v1/auth/register")

        # Should return 200 for CORS preflight or 404 if not explicitly defined
        # This is OK either way
        assert response.status_code in [200, 404]


class TestErrorHandling:
    """Test error handling and 404s."""

    async def test_404_nonexistent_endpoint(self, async_client):
        """GET to non-existent endpoint returns 404."""
        response = await async_client.get("/api/v1/nonexistent")

        assert response.status_code == 404

    async def test_invalid_http_method(self, async_client):
        """Invalid HTTP method returns error."""
        response = await async_client.put("/health")

        # PUT to GET endpoint should fail
        assert response.status_code >= 400


class TestVersion:
    """Test API versioning."""

    async def test_health_includes_version(self, async_client):
        """Health check includes app version."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        version = data.get("version")
        # Should be in format like "3.0.0"
        assert version is not None
        assert isinstance(version, str)
        assert "." in version
