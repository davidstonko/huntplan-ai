"""
WebSocket Routes — Real-time Deer Camp Sync

Endpoint: ws://host/ws/camps/{camp_id}?token={jwt_token}

Message types (client → server):
  - annotation_add:    New pin/route/area placed on map
  - annotation_update: Existing annotation edited
  - annotation_delete: Annotation removed
  - photo_added:       New photo uploaded (after S3 upload completes)
  - location_update:   Member moved (optional real-time tracking)
  - ping:              Keep-alive

Message types (server → client):
  - connection_established: Sent on connect with online roster
  - member_online:     A member joined the camp session
  - member_offline:    A member left the camp session
  - annotation_add:    Broadcast new annotation to all members
  - annotation_update: Broadcast annotation edit
  - annotation_delete: Broadcast annotation removal
  - photo_added:       Broadcast new photo notification
  - activity:          New activity feed entry
  - location_update:   Broadcast member location (if enabled)
  - error:             Error message
  - pong:              Keep-alive response
"""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session
from app.modules.websocket.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

async def _verify_ws_token(token: str) -> dict | None:
    """
    Verify JWT token from WebSocket query param.
    Returns user info dict or None if invalid.
    """
    try:
        from jose import jwt, JWTError
        from app.config import settings

        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return {"user_id": user_id}
    except Exception:
        return None


async def _get_member_info(user_id: str, camp_id: str) -> dict | None:
    """
    Verify user is a member of the camp and return their info.
    Returns {username, color, role} or None.
    """
    async with async_session() as session:
        result = await session.execute(
            text("""
                SELECT username, color, role
                FROM camp_members
                WHERE camp_id = :camp_id AND user_id = :user_id
            """),
            {"camp_id": camp_id, "user_id": user_id},
        )
        row = result.fetchone()
        if row:
            return {"username": row.username, "color": row.color, "role": row.role}
        return None

@router.websocket("/ws/camps/{camp_id}")
async def camp_websocket(
    websocket: WebSocket,
    camp_id: str,
    token: str = Query(...),
):
    """
    WebSocket endpoint for real-time Deer Camp collaboration.

    Connect: ws://host/ws/camps/{camp_id}?token={jwt}
    """
    user_info = await _verify_ws_token(token)
    if not user_info:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = user_info["user_id"]

    member_info = await _get_member_info(user_id, camp_id)
    if not member_info:
        await websocket.close(code=4003, reason="Not a member of this camp")
        return

    await manager.connect(
        websocket, camp_id, user_id,
        username=member_info["username"],
        color=member_info["color"],
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "ping":
                await manager.send_personal(websocket, {"type": "pong"})

            elif msg_type == "annotation_add":
                await _handle_annotation_add(camp_id, user_id, member_info, data)

            elif msg_type == "annotation_update":
                await _handle_annotation_update(camp_id, user_id, member_info, data)

            elif msg_type == "annotation_delete":
                await _handle_annotation_delete(camp_id, user_id, member_info, data)

            elif msg_type == "photo_added":
                await _handle_photo_added(camp_id, user_id, member_info, data)

            elif msg_type == "location_update":
                await _handle_location_update(camp_id, user_id, member_info, data)

            else:
                await manager.send_personal(
                    websocket,
                    {"type": "error", "message": f"Unknown message type: {msg_type}"},
                )

    except WebSocketDisconnect:
        username = manager.disconnect(camp_id, user_id)
        if username:
            await manager.broadcast_to_camp(
                camp_id,
                {
                    "type": "member_offline",
                    "user_id": user_id,
                    "username": username,
                    "online_members": manager._get_online_members(camp_id),
                },
            )
    except Exception as e:
        logger.error(f"WS error for user {user_id} in camp {camp_id}: {e}")
        manager.disconnect(camp_id, user_id)

# ─── Message Handlers ───────────────────────────────────────────


async def _handle_annotation_add(camp_id: str, user_id: str, member: dict, data: dict):
    """
    Process new annotation from a member.
    Persists to DB and broadcasts to all other camp members.
    """
    annotation_data = data.get("annotation", {})
    annotation_type = annotation_data.get("type", "waypoint")

    annotation_id = str(uuid.uuid4())
    async with async_session() as session:
        await session.execute(
            text("""
                INSERT INTO shared_annotations (id, camp_id, created_by, annotation_type, data, created_at)
                VALUES (:id, :camp_id, :user_id, :atype, :data::jsonb, NOW())
            """),
            {
                "id": annotation_id,
                "camp_id": camp_id,
                "user_id": user_id,
                "atype": annotation_type,
                "data": str(annotation_data).replace("'", '"'),
            },
        )
        await session.execute(
            text("""
                INSERT INTO camp_activity (id, camp_id, user_id, username, action, annotation_id, timestamp)
                VALUES (:id, :camp_id, :user_id, :username, :action, :ann_id, NOW())
            """),
            {
                "id": str(uuid.uuid4()),
                "camp_id": camp_id,
                "user_id": user_id,
                "username": member["username"],
                "action": f"added_{annotation_type}",
                "ann_id": annotation_id,
            },
        )
        await session.commit()
    await manager.broadcast_to_camp(
        camp_id,
        {
            "type": "annotation_add",
            "annotation_id": annotation_id,
            "annotation_type": annotation_type,
            "annotation": annotation_data,
            "user_id": user_id,
            "username": member["username"],
            "color": member["color"],
            "timestamp": datetime.utcnow().isoformat(),
        },
        exclude_user=user_id,
    )


async def _handle_annotation_update(camp_id: str, user_id: str, member: dict, data: dict):
    """Update an existing annotation and broadcast."""
    annotation_id = data.get("annotation_id")
    annotation_data = data.get("annotation", {})

    if not annotation_id:
        return

    async with async_session() as session:
        await session.execute(
            text("""
                UPDATE shared_annotations SET data = :data::jsonb
                WHERE id = :id AND camp_id = :camp_id
            """),
            {
                "id": annotation_id,
                "camp_id": camp_id,
                "data": str(annotation_data).replace("'", '"'),
            },
        )
        await session.commit()
    await manager.broadcast_to_camp(
        camp_id,
        {
            "type": "annotation_update",
            "annotation_id": annotation_id,
            "annotation": annotation_data,
            "user_id": user_id,
            "username": member["username"],
            "timestamp": datetime.utcnow().isoformat(),
        },
        exclude_user=user_id,
    )


async def _handle_annotation_delete(camp_id: str, user_id: str, member: dict, data: dict):
    """Delete an annotation and broadcast."""
    annotation_id = data.get("annotation_id")
    if not annotation_id:
        return

    async with async_session() as session:
        await session.execute(
            text("DELETE FROM shared_annotations WHERE id = :id AND camp_id = :camp_id"),
            {"id": annotation_id, "camp_id": camp_id},
        )
        await session.execute(
            text("""
                INSERT INTO camp_activity (id, camp_id, user_id, username, action, annotation_id, timestamp)
                VALUES (:id, :camp_id, :user_id, :username, 'removed_annotation', :ann_id, NOW())
            """),
            {
                "id": str(uuid.uuid4()),
                "camp_id": camp_id,
                "user_id": user_id,
                "username": member["username"],
                "ann_id": annotation_id,
            },
        )
        await session.commit()
    await manager.broadcast_to_camp(
        camp_id,
        {
            "type": "annotation_delete",
            "annotation_id": annotation_id,
            "user_id": user_id,
            "username": member["username"],
            "timestamp": datetime.utcnow().isoformat(),
        },
        exclude_user=user_id,
    )


async def _handle_photo_added(camp_id: str, user_id: str, member: dict, data: dict):
    """Broadcast photo upload notification to camp members."""
    await manager.broadcast_to_camp(
        camp_id,
        {
            "type": "photo_added",
            "photo_id": data.get("photo_id"),
            "image_url": data.get("image_url"),
            "thumbnail_url": data.get("thumbnail_url"),
            "lat": data.get("lat"),
            "lng": data.get("lng"),
            "caption": data.get("caption"),
            "user_id": user_id,
            "username": member["username"],
            "color": member["color"],
            "timestamp": datetime.utcnow().isoformat(),
        },
        exclude_user=user_id,
    )


async def _handle_location_update(camp_id: str, user_id: str, member: dict, data: dict):
    """Broadcast member location to camp (opt-in real-time tracking)."""
    await manager.broadcast_to_camp(
        camp_id,
        {
            "type": "location_update",
            "user_id": user_id,
            "username": member["username"],
            "color": member["color"],
            "lat": data.get("lat"),
            "lng": data.get("lng"),
            "heading": data.get("heading"),
            "speed": data.get("speed"),
            "timestamp": datetime.utcnow().isoformat(),
        },
        exclude_user=user_id,
    )

# ─── REST Endpoints for WebSocket Status ────────────────────────


@router.get("/ws/camps/{camp_id}/online")
async def get_online_members(camp_id: str):
    """REST endpoint to check who's online in a camp (fallback for non-WS clients)."""
    return {
        "camp_id": camp_id,
        "online_count": manager.get_camp_member_count(camp_id),
        "members": manager._get_online_members(camp_id),
    }
