"""
Push Notification Tests

Tests for device token registration, unregistration, and push dispatch.
Focuses on endpoint structure and auth validation (no full DB).
"""

import pytest
import uuid
from starlette.testclient import TestClient

from app.main import app
from app.modules.auth.service import create_access_token
from app.modules.push.apns_client import send_push_to_token


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_token():
    """Create JWT token for test user."""
    test_user_id = str(uuid.uuid4())
    return create_access_token(test_user_id)


# ─── Tests ────────────────────────────────────────────────────────

def test_push_endpoints_in_openapi_spec(client):
    """Test that all push endpoints are registered in OpenAPI spec."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    paths = spec.get("paths", {})

    # Verify all push endpoints are in the spec
    expected_endpoints = [
        "/api/v1/push/register",
        "/api/v1/push/unregister",
        "/api/v1/push/send",
        "/api/v1/push/admin/tokens",
        "/api/v1/push/health",
    ]

    for endpoint in expected_endpoints:
        assert endpoint in paths, f"Endpoint {endpoint} not found in OpenAPI spec"


@pytest.mark.asyncio
async def test_send_push_to_token_dev_mode(monkeypatch):
    """Test sending push in dev mode (APNS not configured)."""
    # Mock settings to disable APNS
    from app.modules.push import apns_client
    monkeypatch.setattr(apns_client, '_apns_configured', False)
    monkeypatch.setattr(apns_client, '_apns_client', None)

    # Send should succeed but log instead
    success, msg = await send_push_to_token(
        device_token="test123token456",
        title="Test",
        body="Test body",
    )

    assert success == True
    assert "logged" in msg
