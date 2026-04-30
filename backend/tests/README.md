# MDHuntFishOutdoors Backend Test Suite

Comprehensive pytest test suite for the FastAPI backend, covering authentication, deer camp collaboration, and health checks.

## Files

- **conftest.py** — Shared fixtures and test database setup
  - Async test database (SQLite in-memory)
  - FastAPI test clients (async and sync)
  - Auth helpers and fixtures
  - Sample data fixtures for camps, users, annotations

- **test_auth.py** — Authentication module tests
  - Device registration and JWT generation
  - Profile management (get, update)
  - Token refresh and validation
  - Error handling

- **test_deercamp.py** — Deer camp collaboration tests
  - Create/list/delete camps
  - Invite code and membership
  - Annotations (waypoints, routes, areas, tracks)
  - Activity feed
  - Offline-first sync endpoint

- **test_health.py** — Health check and system tests
  - /health endpoint
  - /docs (Swagger UI)
  - OpenAPI schema
  - Error handling and 404s

## Setup

### 1. Install Test Dependencies

All test dependencies are in `requirements.txt`:

```bash
pip install -r requirements.txt
```

Key packages:
- `pytest` — Test runner
- `pytest-asyncio` — Async test support
- `httpx` — Async HTTP client for tests

### 2. Configure Test Database

Tests use an **in-memory SQLite database** for speed and isolation. No external PostgreSQL needed.

The `conftest.py` fixture `test_db_engine` automatically:
- Creates an in-memory SQLite engine
- Runs `Base.metadata.create_all()` to create all tables
- Provides isolated sessions to each test
- Cleans up after each test

## Running Tests

### Run all tests

```bash
pytest tests/
```

### Run specific test file

```bash
pytest tests/test_auth.py
pytest tests/test_deercamp.py
pytest tests/test_health.py
```

### Run specific test class

```bash
pytest tests/test_auth.py::TestRegisterDevice
```

### Run specific test method

```bash
pytest tests/test_auth.py::TestRegisterDevice::test_register_new_device
```

### Run with verbose output

```bash
pytest tests/ -v
```

### Run with coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

### Run only fast tests (skip slow integration tests)

```bash
pytest tests/ -m "not slow"
```

## Test Organization

### Auth Tests (`test_auth.py`)

#### TestRegisterDevice
- `test_register_new_device` — New user auto-creates account
- `test_register_with_custom_handle` — Custom handle on registration
- `test_register_duplicate_device` — Same device returns existing user
- `test_register_auto_generate_device_token` — Server generates device token

#### TestGetProfile
- `test_get_profile_authenticated` — Fetch profile with valid token
- `test_get_profile_no_auth` — 401 without token
- `test_get_profile_invalid_token` — 401 with bad token

#### TestUpdateProfile
- `test_update_profile_email` — Update single field
- `test_update_profile_experience_level` — Update experience level
- `test_update_profile_multiple_fields` — Batch update

#### TestRefreshToken
- `test_refresh_valid_token` — Get new JWT
- `test_refresh_invalid_token` — 401 on invalid token

#### TestAuthErrorCases
- `test_duplicate_handle` — Unique constraint on handles
- `test_deactivated_user` — Inactive users denied access

#### TestAuthIntegration
- `test_registration_and_profile_flow` — Full register → profile → update → refresh workflow

### Deer Camp Tests (`test_deercamp.py`)

#### TestCreateCamp
- `test_create_camp_basic` — Create with required fields
- `test_create_camp_with_linked_land` — Link to public hunting land
- `test_create_camp_no_auth` — 401 without auth

#### TestListCamps
- `test_list_camps_empty` — No camps returns empty list
- `test_list_camps_with_data` — List user's camps

#### TestGetCamp
- `test_get_camp_valid` — Fetch single camp
- `test_get_camp_not_found` — 404 for non-existent camp

#### TestJoinCamp
- `test_join_camp_valid_code` — Join with correct invite code
- `test_join_camp_invalid_code` — Error on wrong code
- `test_join_camp_already_member` — Cannot rejoin

#### TestCreateAnnotation
- `test_create_waypoint` — Add waypoint annotation
- `test_create_route` — Add route annotation
- `test_create_annotation_not_member` — Non-members denied

#### TestActivityFeed
- `test_get_activity_feed` — Fetch camp activity log
- `test_activity_feed_pagination` — Limit and offset support

#### TestSync
- `test_sync_full` — Full sync (all data)
- `test_sync_incremental` — Sync since timestamp

#### TestDeerCampIntegration
- `test_full_camp_workflow` — Create → join → annotate → feed flow
- `test_member_permissions` — Member vs admin permissions

### Health Check Tests (`test_health.py`)

#### TestHealth
- `test_health_check` — /health returns 200
- `test_root_endpoint` — / returns welcome message

#### TestDocumentation
- `test_docs_available` — /docs (Swagger UI) accessible
- `test_openapi_schema` — /openapi.json returns valid schema

#### TestCORS
- `test_cors_headers` — CORS headers present
- `test_options_request` — CORS preflight

#### TestErrorHandling
- `test_404_nonexistent_endpoint` — 404 for unknown routes
- `test_invalid_http_method` — Invalid method returns error

#### TestVersion
- `test_health_includes_version` — Version in /health response

## Fixtures

### Database Fixtures

- `test_db_engine` — In-memory SQLite engine
- `test_db_session` — Async database session
- `override_get_db` — Override FastAPI dependency injection

### HTTP Client Fixtures

- `async_client` — AsyncClient for testing async endpoints
- `sync_client` — TestClient for sync testing (reference only)

### User Fixtures

- `test_user` — Standard test user
- `test_admin_user` — Admin test user
- `test_users` — List of 3 test users
- `auth_token` — JWT for test_user
- `admin_auth_token` — JWT for admin user
- `auth_headers` — HTTP headers with bearer token
- `admin_auth_headers` — HTTP headers with admin token

### Deer Camp Fixtures

- `test_deer_camp` — Single camp (created by test_user)
- `test_camp_member` — Camp membership (test_user → test_deer_camp)
- `test_camp_with_members` — Multi-member camp (creator + 3 others)
- `test_annotation_waypoint` — Sample waypoint annotation
- `test_annotation_route` — Sample route annotation
- `test_camp_photo` — Sample geotagged photo
- `test_camp_activity` — Sample activity log entry

## Async Testing

Tests use `pytest-asyncio` with `asyncio_mode = auto`. This means:

- All `async def test_*()` functions are automatically detected
- All fixtures with `@pytest_asyncio.fixture` are async
- No need to manually wrap with `asyncio.run()`

Example:

```python
async def test_create_camp(self, async_client, auth_headers):
    """This is automatically scheduled as a coroutine."""
    response = await async_client.post(
        "/api/v1/deercamp/camps",
        headers=auth_headers,
        json={"name": "Test", "center_lat": 39.2, "center_lng": -76.6}
    )
    assert response.status_code == 200
```

## Testing Patterns

### Authenticated Requests

```python
async def test_something(self, async_client, auth_headers):
    response = await async_client.get(
        "/api/v1/auth/me",
        headers=auth_headers
    )
    assert response.status_code == 200
```

### Creating Fixtures On-the-Fly

```python
async def test_with_database(self, test_db_session, test_user):
    # You have a transaction to the test database
    response = await db_session.execute(
        select(User).where(User.id == test_user.id)
    )
    user = response.scalar_one()
    assert user.handle == test_user.handle
```

### Testing Membership Permissions

```python
async def test_member_action(self, async_client, test_deer_camp, test_users):
    other_user = test_users[0]
    token = create_access_token(str(other_user.id))
    headers = {"Authorization": f"Bearer {token}"}

    # Non-member action should fail
    response = await async_client.post(
        f"/api/v1/deercamp/camps/{test_deer_camp.id}/annotations",
        headers=headers,
        json={...}
    )
    assert response.status_code == 403
```

## Common Issues

### "Asyncio event loop is closed"

If you see this, it's usually harmless. Pytest-asyncio handles cleanup.

### Tests timeout

Default timeout is 30 seconds (set in `pytest.ini`). Increase with:

```bash
pytest tests/ --timeout=60
```

### Database locked (sqlite)

SQLite in-memory databases can have locking issues. Make sure each test gets its own session via fixtures.

### Import errors

If tests fail to import `app` modules, check:

```bash
export PYTHONPATH=/path/to/backend:$PYTHONPATH
```

## Writing New Tests

Template:

```python
"""Test module docstring."""

import pytest
from sqlalchemy import select
from app.models import SomeModel

class TestSomeFeature:
    """Test class docstring."""

    async def test_basic_scenario(self, async_client, auth_headers, test_db_session):
        """Test description."""
        # Arrange
        data = {"key": "value"}

        # Act
        response = await async_client.post(
            "/api/v1/endpoint",
            headers=auth_headers,
            json=data
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["expected_field"] == "expected_value"

        # Optionally verify in DB
        db_result = await test_db_session.execute(
            select(SomeModel).where(SomeModel.id == result["id"])
        )
        db_obj = db_result.scalar_one()
        assert db_obj.field == "expected_value"
```

## CI/CD Integration

Add to your CI pipeline (GitHub Actions, etc.):

```yaml
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest tests/ --cov=app --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Performance Notes

- Tests run against in-memory SQLite, so they're **very fast** (~1-2 seconds total)
- No PostgreSQL setup required
- Each test gets isolated database state
- Fixtures are reused within each test (not across tests)

## Future Enhancements

- Add load tests with `locust` or `pytest-benchmark`
- Add WebSocket tests for camp chat
- Add file upload tests for photos
- Add permission matrix tests
- Add database constraint violation tests
- Add race condition tests for concurrent operations
