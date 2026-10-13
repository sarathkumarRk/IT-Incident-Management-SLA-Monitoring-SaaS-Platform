import logging
from typing import Dict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()

        self.active_connections.setdefault(user_id, set()).add(websocket)

        logger.info("WebSocket connected for user %s", user_id)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self.active_connections.get(user_id)

        if connections:
            connections.discard(websocket)

            if not connections:
                self.active_connections.pop(user_id, None)

        logger.info("WebSocket disconnected for user %s", user_id)

    async def send_to_user(self, user_id: int, message: dict) -> bool:
        connections = self.active_connections.get(user_id, set())
        success = True

        for websocket in list(connections):
            try:
                await websocket.send_json(message)
            except Exception:
                success = False
                logger.exception(
                    "Failed to send WebSocket update to user %s",
                    user_id,
                )
                self.disconnect(user_id, websocket)

        return success

    async def send_to_users(
        self,
        user_ids: list[int],
        message: dict,
    ) -> None:
        for user_id in set(user_ids):
            try:
                await self.send_to_user(user_id, message)
            except Exception:
                logger.exception(
                    "WebSocket notification failed for user %s",
                    user_id,
                )

    async def broadcast(self, message: dict) -> None:
        for user_id in list(self.active_connections.keys()):
            try:
                await self.send_to_user(user_id, message)
            except Exception:
                logger.exception(
                    "WebSocket broadcast failed for user %s",
                    user_id,
                )


websocket_manager = WebSocketManager()


async def notify_incident_status(
    incident_id: int,
    status: str,
    user_ids: list[int] | None = None,
) -> None:
    message = {
        "event": "incident_status_changed",
        "incident_id": incident_id,
        "status": status,
    }

    if user_ids is None:
        logger.warning(
            "Status notification for incident %s has no recipient list; "
            "notification was not broadcast",
            incident_id,
        )
        return

    await websocket_manager.send_to_users(user_ids, message)


async def notify_incident_assignment(
    incident_id: int,
    assigned_to: int,
    user_ids: list[int] | None = None,
) -> None:
    message = {
        "event": "incident_assignment_changed",
        "incident_id": incident_id,
        "assigned_to": assigned_to,
    }

    if user_ids is None:
        logger.warning(
            "Assignment notification for incident %s has no recipient list; "
            "notification was not broadcast",
            incident_id,
        )
        return

    await websocket_manager.send_to_users(user_ids, message)