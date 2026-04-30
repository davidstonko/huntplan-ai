"""
HuntPlan AI — Landowner Blind Sites Tests

Tests for landowner blind favorites endpoints. Matches the endpoint-structure
pattern used by test_camping.py / test_hiking.py (no full DB metadata.create_all
because the shared Base pulls in PostgreSQL-only columns like JSONB that SQLite
can't compile).
"""

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.modules.auth.service import create_access_token


@pytest.fixture(scope="function")
def client():
    """Test client without full DB setup — mirrors test_camping pattern."""
    return TestClient(app)


@pytest.fixture
def auth_token():
    """Create JWT token for test user."""
    test_user_id = "00000000-0000-0000-0000-000000000000"
    return create_access_token(test_user_id)


# --- Auth guard tests ---


def test_favorite_blind_requires_auth(client):
    """POST /api/v1/landowner-blinds/{id}/favorite requires auth."""
    response = client.post("/api/v1/landowner-blinds/blind_123/favorite")
    assert response.status_code == 401


def test_unfavorite_blind_requires_auth(client):
    """DELETE /api/v1/landowner-blinds/{id}/favorite requires auth."""
    response = client.delete("/api/v1/landowner-blinds/blind_123/favorite")
    assert response.status_code == 401


def test_list_favorites_requires_auth(client):
    """GET /api/v1/landowner-blinds/favorites requires auth."""
    response = client.get("/api/v1/landowner-blinds/favorites")
    assert response.status_code == 401


# --- Module wiring tests ---


def test_module_imports():
    """The landowner blinds module imports and exposes a router."""
    from app.modules.landowner_blinds import router
    assert router is not None


def test_router_is_registered():
    """Router is registered on the app at the expected prefix."""
    # If main.py registered the router, GET /api/v1/landowner-blinds/favorites
    # should hit the route and return 401 (not 404).
    client = TestClient(app)
    response = client.get("/api/v1/landowner-blinds/favorites")
    assert response.status_code == 401  # route exists, just unauthorized


# Token-authenticated handler tests are deferred — they require a real DB
# session, and the shared Base schema pulls in PostgreSQL-only columns that
# SQLite can't compile. Endpoint-structure + auth-guard coverage is sufficient
# for V2.2.0 submission; DB-integration tests belong in a pg-backed CI run.
