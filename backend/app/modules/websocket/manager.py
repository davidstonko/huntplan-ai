"""
WebSocket Connection Manager — Real-time Deer Camp Sync

Manages WebSocket connections per camp, handles:
- Member online/offline presence
- Real-time annotation broadcasts (pin drops, route draws, area marks)
- Photo upload notifications
- Activity feed live updates

Each camp has its own room. Members authenticate via JWT on connect.
Graceful degradation: if WebSocket fails, mobile app falls back to REST polling.
"""

import logging
import json
from typing import Optional
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections grouped by camp_id.

    Structure:
        active_connections = {
            camp_id: {
                user_id: {
                    "ws": WebSocket,
                    "username": str,
                    "color": str,
                    "connected_at": str,
                }
            }
        }
    """

    def __init__(self):
        # camp_id -> {user_id -> connection_info}
        self.active_connections: dict[str, dict[str, dict]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        camp_id: str,
        user_id: str,
        username: str,
        color: str = "#FF6B35",
    ):
        """Accept a WebSocket connection and add to camp room."""
        await websocket.accept()

        if camp_id not in self.active_connections:
            self.active_connections[camp_id] = {}

        self.active_connections[camp_id][user_id] = {
            "ws": websocket,
            "username": username,
            "color": color,
            "connected_at": datetime.utcnow().isoformat(),
        }

        logger.info(f"WS: {username} joined camp {camp_id} ({len(self.active_connections[camp_id])} online)")

        # Broadcast presence update to other members
        await self.broadcast_to_camp(
            camp_id,
            {
                "type": "member_online",
                "user_id": user_id,
                "username": username,
                "color": color,
                "online_members": self._get_online_members(camp_id),
            },
            exclude_user=user_id,
        )

        # Send current online roster to the joining member
        await self.send_personal(
            websocket,
            {
                "type": "connection_established",
                "camp_id": camp_id,
                "online_members": self._get_online_members(camp_id),
            },
        )

    def disconnect(self, camp_id: str, user_id: str) -> Optional[str]:
        """Remove a connection and return username for broadcast."""
        if camp_id in self.active_connections:
            conn = self.active_connections[camp_id].pop(user_id, None)
            if not self.active_connections[camp_id]:
                del self.active_connections[camp_id]
            if conn:
                logger.info(f"WS: {conn['username']} left camp {camp_id}")
                return conn["username"]
        return None

    async def broadcast_to_camp(
        self,
        camp_id: str,
        message: dict,
        exclude_user: Optional[str] = None,
    ):
        """Send a message to all connected members in a camp."""
        if camp_id not in self.active_connections:
            return

        disconnected = []
        for uid, conn in self.active_connections[camp_id].items():
            if uid == exclude_user:
                continue
            try:
                await conn["ws"].send_json(message)
            except Exception:
                disconnected.append(uid)

        # Clean up dead connections
        for uid in disconnected:
            self.active_connections[camp_id].pop(uid, None)

    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a single connection."""
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    def _get_online_members(self, camp_id: str) -> list[dict]:
        """Get list of currently online members in a camp."""
        if camp_id not in self.active_connections:
            return []
        return [
            {
                "user_id": uid,
                "username": conn["username"],
                "color": conn["color"],
                "connected_at": conn["connected_at"],
            }
            for uid, conn in self.active_connections[camp_id].items()
        ]

    def get_camp_member_count(self, camp_id: str) -> int:
        """Get number of online members in a camp."""
        return len(self.active_connections.get(camp_id, {}))

    def is_user_online(self, camp_id: str, user_id: str) -> bool:
        """Check if a specific user is online in a camp."""
        return user_id in self.active_connections.get(camp_id, {})


# Singleton instance — shared across the application
manager = ConnectionManager()
