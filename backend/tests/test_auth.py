"""
Tests for authentication module (POST /api/v1/auth/*)

Tests the anonymous-first auth system:
- Device registration
- JWT token generation and validation
- Profile management
- Token refresh
"""

import pytest
from sqlalchemy import select

from app.models.user import User
from app.modules.auth.service import generate_device_token


class TestRegisterDevice:
    """Test POST /api/v1/auth/register — Device registration and user creation."""

    async def test_register_new_device(self, async_client):
        """Register a new device — should create a new user with JWT."""
        device_token = generate_device_token()

        response = await async_client.post(
            "/api/v1/auth/register",
            json={"device_token": device_token}
        )

        assert response.status_code == 200
        data = response.json()

        # Validate response structure
        assert "user_id" in data
        assert "handle" in data
        assert "device_token" in data
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Handle should be auto-generated
        assert data["handle"].startswith("Hunter_")
        assert data["device_token"] == device_token

    async def test_register_with_custom_handle(self, async_client):
        """Register with a custom handle."""
        device_token = generate_device_token()
        custom_handle = "BuckMaster_2026"

        response = await async_client.post(
            "/api/v1/auth/register",
            json={"device_token": device_token, "handle": custom_handle}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["handle"] == custom_handle

    async def test_register_duplicate_device(self, async_client, test_user):
        """Register the same device again — should return existing user."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={"device_token": test_user.device_token}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return existing user's ID
        assert data["user_id"] == str(test_user.id)
        assert data["handle"] == test_user.handle

    async def test_register_auto_generate_device_token(self, async_client):
        """Register without device_token — server should generate one."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={}
        )

        assert response.status_code == 200
        data = response.json()

        # Device token should be present and non-empty
        assert "device_token" in data
        assert len(data["device_token"]) > 0


class TestGetProfile:
    """Test GET /api/v1/auth/me — Fetch current user profile."""

    async def test_get_profile_authenticated(self, async_client, test_user, auth_headers):
        """Fetch profile with valid token."""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Validate profile data
        assert data["user_id"] == str(test_user.id)
        assert data["handle"] == test_user.handle
        assert data["email"] == test_user.email
        assert data["experience_level"] == test_user.experience_level
        assert data["home_county"] == test_user.home_county
        assert data["home_state"] == test_user.home_state

    async def test_get_profile_no_auth(self, async_client):
        """Fetch profile without token — should return 401."""
        response = await async_client.get("/api/v1/auth/me")

        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]

    async def test_get_profile_invalid_token(self, async_client):
        """Fetch profile with invalid token — should return 401."""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )

        assert response.status_code == 401
        assert "Invalid or expired token" in response.json()["detail"]

    async def test_get_profile_malformed_header(self, async_client):
        """Fetch profile with malformed Authorization header."""
        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "NotBearer xyz"}
        )

        assert response.status_code == 401


class TestUpdateProfile:
    """Test PATCH /api/v1/auth/profile — Update user profile."""

    async def test_update_profile_email(self, async_client, test_user, auth_headers, test_db_session):
        """Update email address."""
        new_email = "newemail@example.com"

        response = await async_client.patch(
            "/api/v1/auth/profile",
            headers=auth_headers,
            json={"email": new_email}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == new_email

        # Verify in database
        result = await test_db_session.execute(
            select(User).where(User.id == test_user.id)
        )
        updated_user = result.scalar_one()
        assert updated_user.email == new_email

    async def test_update_profile_experience_level(self, async_client, test_user, auth_headers):
        """Update experience level."""
        response = await async_client.patch(
            "/api/v1/auth/profile",
            headers=auth_headers,
            json={"experience_level": "expert"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["experience_level"] == "expert"

    async def test_update_profile_multiple_fields(self, async_client, test_user, auth_headers):
        """Update multiple profile fields at once."""
        update_data = {
            "experience_level": "expert",
            "preferred_species": "Deer, Waterfowl",
            "home_county": "Howard",
            "home_state": "VA",
        }

        response = await async_client.patch(
            "/api/v1/auth/profile",
            headers=auth_headers,
            json=update_data
        )

        assert response.status_code == 200
        data = response.json()

        for key, value in update_data.items():
            assert data[key] == value

    async def test_update_profile_no_auth(self, async_client):
        """Update profile without authentication."""
        response = await async_client.patch(
            "/api/v1/auth/profile",
            json={"experience_level": "expert"}
        )

        assert response.status_code == 401

    async def test_update_profile_nonexistent_user(self, async_client):
        """Update profile with token of deleted user."""
        from app.modules.auth.service import create_access_token

        # Create a token for a non-existent user ID
        fake_token = create_access_token("00000000-0000-0000-0000-000000000000")

        response = await async_client.patch(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {fake_token}"},
            json={"experience_level": "expert"}
        )

        assert response.status_code == 401


class TestRefreshToken:
    """Test POST /api/v1/auth/refresh — Token refresh."""

    async def test_refresh_valid_token(self, async_client, auth_token):
        """Refresh a valid access token."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"access_token": auth_token}
        )

        assert response.status_code == 200
        data = response.json()

        # New token should be present and different (likely)
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # New token != old token (unless very unlikely timing)
        # assert data["access_token"] != auth_token

    async def test_refresh_invalid_token(self, async_client):
        """Refresh with an invalid token."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"access_token": "invalid.token.here"}
        )

        assert response.status_code == 401
        assert "Invalid token" in response.json()["detail"]

    async def test_refresh_malformed_token(self, async_client):
        """Refresh with malformed token."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"access_token": "not-a-jwt"}
        )

        assert response.status_code == 401

    async def test_refresh_missing_token(self, async_client):
        """Refresh endpoint called without access_token in body."""
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={}
        )

        # Should fail validation (422)
        assert response.status_code == 422


class TestAuthErrorCases:
    """Test error handling and edge cases."""

    async def test_duplicate_handle(self, async_client, test_user):
        """Attempt to register with an existing handle — should fail."""
        device_token = generate_device_token()

        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "device_token": device_token,
                "handle": test_user.handle
            }
        )

        # Should fail due to unique constraint
        assert response.status_code >= 400

    async def test_deactivated_user(self, async_client, test_user, test_db_session):
        """Deactivated users should not be able to authenticate."""
        from app.modules.auth.service import create_access_token

        # Deactivate the user
        test_user.is_active = False
        await test_db_session.flush()

        token = create_access_token(str(test_user.id))

        response = await async_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 401
        assert "deactivated" in response.json()["detail"]


class TestAuthIntegration:
    """Integration tests for auth workflows."""

    async def test_registration_and_profile_flow(self, async_client):
        """Full flow: register → fetch profile → update profile."""
        # 1. Register
        device_token = generate_device_token()
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json={"device_token": device_token}
        )

        assert register_response.status_code == 200
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Fetch profile
        profile_response = await async_client.get(
            "/api/v1/auth/me",
            headers=headers
        )

        assert profile_response.status_code == 200
        profile_data = profile_response.json()

        # 3. Update profile
        update_response = await async_client.patch(
            "/api/v1/auth/profile",
            headers=headers,
            json={
                "experience_level": "expert",
                "home_county": "Anne Arundel",
            }
        )

        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["experience_level"] == "expert"
        assert updated["home_county"] == "Anne Arundel"

        # 4. Refresh token
        refresh_response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"access_token": token}
        )

        assert refresh_response.status_code == 200
        new_token = refresh_response.json()["access_token"]

        # 5. Use new token
        new_headers = {"Authorization": f"Bearer {new_token}"}
        final_response = await async_client.get(
            "/api/v1/auth/me",
            headers=new_headers
        )

        assert final_response.status_code == 200
        assert final_response.json()["user_id"] == profile_data["user_id"]
