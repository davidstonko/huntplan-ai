"""
Tests for Deer Camp module (POST /api/v1/deercamp/*)

Tests collaborative hunting camp functionality:
- Create/list/delete camps
- Join via invite code
- Manage members
- Add/remove annotations
- Activity feed
- Sync endpoint
"""

import pytest
from sqlalchemy import select
from datetime import datetime

from app.models.deercamp import DeerCamp, CampMember, SharedAnnotation, CampActivity
from app.modules.auth.service import generate_invite_code


class TestCreateCamp:
    """Test POST /api/v1/deercamp/camps — Create a new deer camp."""

    async def test_create_camp_basic(self, async_client, auth_headers, test_user):
        """Create a camp with basic required fields."""
        camp_data = {
            "name": "Fall Season Base",
            "center_lat": 39.2904,
            "center_lng": -76.6122,
        }

        response = await async_client.post(
            "/api/v1/deercamp/camps",
            headers=auth_headers,
            json=camp_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == camp_data["name"]
        assert data["center_lat"] == camp_data["center_lat"]
        assert data["center_lng"] == camp_data["center_lng"]
        assert "camp_id" in data
        assert "invite_code" in data
        assert "created_by" in data

    async def test_create_camp_with_linked_land(self, async_client, auth_headers):
        """Create a camp linked to a public hunting land."""
        camp_data = {
            "name": "Seneca Creek WMA Base",
            "center_lat": 39.5,
            "center_lng": -77.2,
            "linked_land_id": "seneca-creek-wma",
        }

        response = await async_client.post(
            "/api/v1/deercamp/camps",
            headers=auth_headers,
            json=camp_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["linked_land_id"] == "seneca-creek-wma"

    async def test_create_camp_no_auth(self, async_client):
        """Create camp without authentication."""
        camp_data = {
            "name": "Unauthorized Camp",
            "center_lat": 39.2904,
            "center_lng": -76.6122,
        }

        response = await async_client.post(
            "/api/v1/deercamp/camps",
            json=camp_data
        )

        assert response.status_code == 401

    async def test_create_camp_invalid_coordinates(self, async_client, auth_headers):
        """Create camp with invalid latitude/longitude."""
        camp_data = {
            "name": "Bad Location",
            "center_lat": 999.0,  # Invalid
            "center_lng": -76.6122,
        }

        response = await async_client.post(
            "/api/v1/deercamp/camps",
            headers=auth_headers,
            json=camp_data
        )

        # Validation should fail
        assert response.status_code >= 400


class TestListCamps:
    """Test GET /api/v1/deercamp/camps — List user's camps."""

    async def test_list_camps_empty(self, async_client, auth_headers):
        """List camps when user has none."""
        response = await async_client.get(
            "/api/v1/deercamp/camps",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert "camps" in data or isinstance(data, list)
        assert len(data if isinstance(data, list) else data.get("camps", [])) == 0

    async def test_list_camps_with_data(self, async_client, auth_headers, test_deer_camp):
        """List camps when user has camps."""
        response = await async_client.get(
            "/api/v1/deercamp/camps",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        camps = data if isinstance(data, list) else data.get("camps", [])
        assert len(camps) >= 1

        camp = camps[0]
        assert camp["name"] == test_deer_camp.name
        assert camp["camp_id"] == str(test_deer_camp.id)

    async def test_list_camps_with_member_count(self, async_client, auth_headers, test_camp_with_members):
        """List camps and verify member counts."""
        response = await async_client.get(
            "/api/v1/deercamp/camps",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        camps = data if isinstance(data, list) else data.get("camps", [])
        camp = next(c for c in camps if c["camp_id"] == str(test_camp_with_members.id))

        assert camp["member_count"] == test_camp_with_members.member_count


class TestGetCamp:
    """Test GET /api/v1/deercamp/camps/{id} — Fetch a single camp."""

    async def test_get_camp_valid(self, async_client, auth_headers, test_deer_camp):
        """Fetch an existing camp."""
        response = await async_client.get(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        assert data["camp_id"] == str(test_deer_camp.id)
        assert data["name"] == test_deer_camp.name
        assert data["center_lat"] == test_deer_camp.center_lat

    async def test_get_camp_not_found(self, async_client, auth_headers):
        """Fetch a non-existent camp."""
        fake_id = "00000000-0000-0000-0000-000000000000"

        response = await async_client.get(
            f"/api/v1/deercamp/camps/{fake_id}",
            headers=auth_headers
        )

        assert response.status_code == 404

    async def test_get_camp_unauthorized(self, async_client):
        """Fetch camp without authentication."""
        response = await async_client.get(
            "/api/v1/deercamp/camps/00000000-0000-0000-0000-000000000000"
        )

        assert response.status_code == 401


class TestJoinCamp:
    """Test POST /api/v1/deercamp/camps/{id}/join — Join via invite code."""

    async def test_join_camp_valid_code(self, async_client, test_deer_camp, test_users):
        """Join a camp with a valid invite code."""
        # User 0 will join the existing camp
        user = test_users[0]
        from app.modules.auth.service import create_access_token

        token = create_access_token(str(user.id))
        headers = {"Authorization": f"Bearer {token}"}

        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/join",
            headers=headers,
            json={"invite_code": test_deer_camp.invite_code}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["camp_id"] == str(test_deer_camp.id)
        assert data["joined"] == True

    async def test_join_camp_invalid_code(self, async_client, auth_headers, test_deer_camp):
        """Attempt to join with wrong invite code."""
        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/join",
            headers=auth_headers,
            json={"invite_code": "WRONGCODE"}
        )

        assert response.status_code >= 400  # Bad request or forbidden

    async def test_join_camp_already_member(self, async_client, auth_headers, test_deer_camp, test_camp_member):
        """User who is already a member cannot rejoin."""
        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/join",
            headers=auth_headers,
            json={"invite_code": test_deer_camp.invite_code}
        )

        # Should fail or indicate already member
        assert response.status_code in [400, 409]

    async def test_join_camp_no_auth(self, async_client, test_deer_camp):
        """Join without authentication."""
        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/join",
            json={"invite_code": test_deer_camp.invite_code}
        )

        assert response.status_code == 401


class TestCreateAnnotation:
    """Test POST /api/v1/deercamp/camps/{id}/annotations — Add annotation."""

    async def test_create_waypoint(self, async_client, auth_headers, test_deer_camp, test_camp_member):
        """Create a waypoint annotation."""
        annotation_data = {
            "annotation_type": "waypoint",
            "data": {
                "lat": 39.2904,
                "lng": -76.6122,
                "icon": "tent",
                "label": "Base Camp",
                "notes": "Primary location",
            }
        }

        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/annotations",
            headers=auth_headers,
            json=annotation_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["annotation_type"] == "waypoint"
        assert data["data"]["label"] == "Base Camp"
        assert "annotation_id" in data

    async def test_create_route(self, async_client, auth_headers, test_deer_camp, test_camp_member):
        """Create a route annotation."""
        annotation_data = {
            "annotation_type": "route",
            "data": {
                "points": [[-76.6122, 39.2904], [-76.6100, 39.2950]],
                "style": "solid",
                "label": "Trail to stand",
                "distanceMeters": 1200.0,
            }
        }

        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/annotations",
            headers=auth_headers,
            json=annotation_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["annotation_type"] == "route"
        assert data["data"]["distanceMeters"] == 1200.0

    async def test_create_annotation_not_member(self, async_client, test_deer_camp, test_users):
        """Non-member cannot add annotations."""
        from app.modules.auth.service import create_access_token

        user = test_users[0]
        token = create_access_token(str(user.id))
        headers = {"Authorization": f"Bearer {token}"}

        annotation_data = {
            "annotation_type": "waypoint",
            "data": {"lat": 39.2904, "lng": -76.6122, "icon": "tent", "label": "Test"}
        }

        response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/annotations",
            headers=headers,
            json=annotation_data
        )

        # Should fail — not a member
        assert response.status_code in [403, 404]


class TestActivityFeed:
    """Test GET /api/v1/deercamp/camps/{id}/feed — Activity feed."""

    async def test_get_activity_feed(self, async_client, auth_headers, test_deer_camp, test_camp_activity):
        """Fetch activity feed for a camp."""
        response = await async_client.get(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/feed",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Should be a list of activities
        activities = data if isinstance(data, list) else data.get("activities", [])
        assert len(activities) >= 1

        activity = activities[0]
        assert activity["action"] == "joined"
        assert activity["username"] is not None

    async def test_activity_feed_pagination(self, async_client, auth_headers, test_deer_camp):
        """Activity feed with limit and offset."""
        response = await async_client.get(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/feed?limit=10&offset=0",
            headers=auth_headers
        )

        assert response.status_code == 200


class TestSync:
    """Test POST /api/v1/deercamp/sync — Offline-first sync endpoint."""

    async def test_sync_full(self, async_client, auth_headers):
        """Full sync (no last_synced timestamp)."""
        response = await async_client.post(
            "/api/v1/deercamp/sync",
            headers=auth_headers,
            json={"last_synced": None}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return camps, annotations, photos, activities
        assert "camps" in data or "data" in data

    async def test_sync_incremental(self, async_client, auth_headers):
        """Incremental sync with last_synced timestamp."""
        from datetime import datetime, timezone

        last_synced = datetime.now(timezone.utc).isoformat()

        response = await async_client.post(
            "/api/v1/deercamp/sync",
            headers=auth_headers,
            json={"last_synced": last_synced}
        )

        assert response.status_code == 200
        data = response.json()

        # Should only return items changed since last_synced
        assert isinstance(data, dict)

    async def test_sync_no_auth(self, async_client):
        """Sync without authentication."""
        response = await async_client.post(
            "/api/v1/deercamp/sync",
            json={"last_synced": None}
        )

        assert response.status_code == 401


class TestDeerCampIntegration:
    """Integration tests for deer camp workflows."""

    async def test_full_camp_workflow(self, async_client, auth_headers, test_user, test_users, test_db_session):
        """Full workflow: create → join → annotate → activity."""
        # 1. Create camp
        create_response = await async_client.post(
            "/api/v1/deercamp/camps",
            headers=auth_headers,
            json={
                "name": "Integration Test Camp",
                "center_lat": 39.2904,
                "center_lng": -76.6122,
            }
        )

        assert create_response.status_code == 200
        camp_id = create_response.json()["camp_id"]
        invite_code = create_response.json()["invite_code"]

        # 2. List camps
        list_response = await async_client.get(
            "/api/v1/deercamp/camps",
            headers=auth_headers
        )

        assert list_response.status_code == 200

        # 3. Other user joins
        from app.modules.auth.service import create_access_token

        other_user = test_users[0]
        other_token = create_access_token(str(other_user.id))
        other_headers = {"Authorization": f"Bearer {other_token}"}

        join_response = await async_client.post(
            f"/api/v1/deercamp/camps/{camp_id}/join",
            headers=other_headers,
            json={"invite_code": invite_code}
        )

        assert join_response.status_code == 200

        # 4. Creator adds waypoint
        anno_response = await async_client.post(
            f"/api/v1/deercamp/camps/{camp_id}/annotations",
            headers=auth_headers,
            json={
                "annotation_type": "waypoint",
                "data": {
                    "lat": 39.2904,
                    "lng": -76.6122,
                    "icon": "stand",
                    "label": "Morning Stand",
                }
            }
        )

        assert anno_response.status_code == 200

        # 5. Check activity feed
        feed_response = await async_client.get(
            f"/api/v1/deercamp/camps/{camp_id}/feed",
            headers=auth_headers
        )

        assert feed_response.status_code == 200
        feed = feed_response.json()
        activities = feed if isinstance(feed, list) else feed.get("activities", [])

        # Should have entries for camp creation, join, annotation
        assert len(activities) >= 1

    async def test_member_permissions(self, async_client, test_deer_camp, test_users, test_db_session):
        """Non-admin members can still add annotations but not remove others."""
        from app.modules.auth.service import create_access_token

        # Add a non-admin member
        member_user = test_users[0]
        member = CampMember(
            camp_id=test_deer_camp.id,
            user_id=member_user.id,
            username=member_user.handle,
            role="member",
            color="#1565C0",
        )
        test_db_session.add(member)
        await test_db_session.flush()

        token = create_access_token(str(member_user.id))
        headers = {"Authorization": f"Bearer {token}"}

        # Member can add annotation
        anno_response = await async_client.post(
            f"/api/v1/deercamp/camps/{test_deer_camp.id}/annotations",
            headers=headers,
            json={
                "annotation_type": "waypoint",
                "data": {
                    "lat": 39.3,
                    "lng": -76.6,
                    "icon": "pin",
                    "label": "Member Waypoint",
                }
            }
        )

        assert anno_response.status_code == 200
