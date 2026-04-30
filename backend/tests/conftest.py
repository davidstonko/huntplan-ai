"""
Pytest configuration and shared fixtures for MDHuntFishOutdoors backend tests.

Provides:
- Async test database setup (SQLite in-memory)
- FastAPI test client
- Auth helpers
- Sample data fixtures
"""

import uuid
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app
from app.db.database import Base, get_db
from app.models.user import User
from app.models.deercamp import DeerCamp, CampMember, SharedAnnotation, CampPhoto, CampActivity
from app.modules.auth.service import (
    generate_device_token,
    generate_handle,
    generate_invite_code,
    create_access_token,
)


# --- Test Database Setup ---

@pytest_asyncio.fixture
async def test_db_engine():
    """Create an in-memory SQLite database for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        poolclass=StaticPool,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    """Provide a test database session."""
    async_session_maker = async_sessionmaker(
        test_db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def override_get_db(test_db_session):
    """Override the FastAPI get_db dependency for testing."""
    async def _override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


# --- FastAPI Test Client ---

@pytest.fixture
async def async_client(override_get_db):
    """Async HTTP client for testing FastAPI endpoints."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def sync_client(override_get_db):
    """Synchronous test client (for reference, though async preferred)."""
    return TestClient(app)


# --- Auth Fixtures ---

@pytest_asyncio.fixture
async def test_user(test_db_session) -> User:
    """Create a test user."""
    user = User(
        handle=generate_handle(),
        device_token=generate_device_token(),
        email="testuser@example.com",
        email_verified=True,
        experience_level="intermediate",
        preferred_species="Deer, Turkey",
        home_county="Baltimore",
        home_state="MD",
        reputation_score=50,
    )
    test_db_session.add(user)
    await test_db_session.flush()
    return user


@pytest_asyncio.fixture
async def test_admin_user(test_db_session) -> User:
    """Create an admin test user."""
    user = User(
        handle=generate_handle(),
        device_token=generate_device_token(),
        email="admin@example.com",
        email_verified=True,
        experience_level="expert",
        is_admin=True,
        reputation_score=100,
    )
    test_db_session.add(user)
    await test_db_session.flush()
    return user


@pytest_asyncio.fixture
async def auth_token(test_user) -> str:
    """Generate a JWT token for the test user."""
    return create_access_token(str(test_user.id))


@pytest_asyncio.fixture
async def admin_auth_token(test_admin_user) -> str:
    """Generate a JWT token for the admin test user."""
    return create_access_token(str(test_admin_user.id))


@pytest_asyncio.fixture
async def auth_headers(auth_token) -> dict:
    """HTTP headers with Bearer token for authenticated requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def admin_auth_headers(admin_auth_token) -> dict:
    """HTTP headers with admin Bearer token."""
    return {"Authorization": f"Bearer {admin_auth_token}"}


# --- Deer Camp Fixtures ---

@pytest_asyncio.fixture
async def test_deer_camp(test_db_session, test_user) -> DeerCamp:
    """Create a test deer camp."""
    camp = DeerCamp(
        name="Fall Season Base Camp",
        created_by=test_user.id,
        invite_code=generate_invite_code(),
        center_lat=39.2904,
        center_lng=-76.6122,
        default_zoom=13.0,
        linked_land_id=None,
        is_active=True,
        member_count=1,
    )
    test_db_session.add(camp)
    await test_db_session.flush()
    return camp


@pytest_asyncio.fixture
async def test_camp_member(test_db_session, test_deer_camp, test_user) -> CampMember:
    """Create a camp member relationship."""
    member = CampMember(
        camp_id=test_deer_camp.id,
        user_id=test_user.id,
        username=test_user.handle,
        role="admin",
        color="#C62828",
    )
    test_db_session.add(member)
    await test_db_session.flush()
    return member


@pytest_asyncio.fixture
async def test_annotation_waypoint(test_db_session, test_deer_camp, test_user) -> SharedAnnotation:
    """Create a test waypoint annotation."""
    annotation = SharedAnnotation(
        camp_id=test_deer_camp.id,
        created_by=test_user.id,
        annotation_type="waypoint",
        data={
            "lat": 39.2904,
            "lng": -76.6122,
            "icon": "tent",
            "label": "Base Camp",
            "notes": "Primary camp location",
        },
    )
    test_db_session.add(annotation)
    await test_db_session.flush()
    return annotation


@pytest_asyncio.fixture
async def test_annotation_route(test_db_session, test_deer_camp, test_user) -> SharedAnnotation:
    """Create a test route annotation."""
    annotation = SharedAnnotation(
        camp_id=test_deer_camp.id,
        created_by=test_user.id,
        annotation_type="route",
        data={
            "points": [[-76.6122, 39.2904], [-76.6100, 39.2950]],
            "style": "solid",
            "label": "Access Trail",
            "distanceMeters": 5234.0,
        },
    )
    test_db_session.add(annotation)
    await test_db_session.flush()
    return annotation


@pytest_asyncio.fixture
async def test_camp_photo(test_db_session, test_deer_camp, test_user) -> CampPhoto:
    """Create a test camp photo."""
    photo = CampPhoto(
        camp_id=test_deer_camp.id,
        uploaded_by=test_user.id,
        image_key="photos/camp-001.jpg",
        thumbnail_key="photos/camp-001-thumb.jpg",
        lat=39.2904,
        lng=-76.6122,
        caption="Morning view from camp",
    )
    test_db_session.add(photo)
    await test_db_session.flush()
    return photo


@pytest_asyncio.fixture
async def test_camp_activity(test_db_session, test_deer_camp, test_user) -> CampActivity:
    """Create a test activity feed entry."""
    activity = CampActivity(
        camp_id=test_deer_camp.id,
        user_id=test_user.id,
        username=test_user.handle,
        action="joined",
    )
    test_db_session.add(activity)
    await test_db_session.flush()
    return activity


# --- Additional Helper Fixtures ---

@pytest_asyncio.fixture
async def test_users(test_db_session) -> list[User]:
    """Create multiple test users for testing group scenarios."""
    users = []
    for i in range(3):
        user = User(
            handle=f"TestHunter_{i}",
            device_token=generate_device_token(),
            email=f"hunter{i}@example.com",
            experience_level="intermediate",
            home_county="Baltimore",
            home_state="MD",
        )
        test_db_session.add(user)
        users.append(user)

    await test_db_session.flush()
    return users


@pytest_asyncio.fixture
async def test_camp_with_members(test_db_session, test_user, test_users) -> DeerCamp:
    """Create a test camp with multiple members."""
    camp = DeerCamp(
        name="Multi-Member Base Camp",
        created_by=test_user.id,
        invite_code=generate_invite_code(),
        center_lat=39.2904,
        center_lng=-76.6122,
        is_active=True,
        member_count=4,
    )
    test_db_session.add(camp)
    await test_db_session.flush()

    # Add creator as admin
    admin_member = CampMember(
        camp_id=camp.id,
        user_id=test_user.id,
        username=test_user.handle,
        role="admin",
        color="#C62828",
    )
    test_db_session.add(admin_member)

    # Add other users as members
    colors = ["#1565C0", "#F9A825", "#6A1B9A"]
    for i, user in enumerate(test_users):
        member = CampMember(
            camp_id=camp.id,
            user_id=user.id,
            username=user.handle,
            role="member",
            color=colors[i],
        )
        test_db_session.add(member)

    await test_db_session.flush()
    return camp
