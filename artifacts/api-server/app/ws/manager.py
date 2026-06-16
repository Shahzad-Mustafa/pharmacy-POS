import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        logger.info(f"WebSocket connected on channel: {channel}")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].remove(websocket)
        logger.info(f"WebSocket disconnected from channel: {channel}")

    async def send_to_channel(self, channel: str, message: dict):
        if channel in self.active_connections:
            dead = []
            for ws in self.active_connections[channel]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[channel].remove(ws)

    async def broadcast(self, message: dict):
        for channel in list(self.active_connections.keys()):
            await self.send_to_channel(channel, message)


manager = ConnectionManager()
