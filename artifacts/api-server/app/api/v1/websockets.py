import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError
from app.core.security import decode_token
from app.ws.manager import manager

logger = logging.getLogger(__name__)
ws_router = APIRouter()


async def authenticate_ws(token: str) -> str:
    try:
        payload = decode_token(token)
        return payload.get("sub")
    except JWTError:
        return None


@ws_router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = Query(...)):
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.close(code=4001)
        return
    channel = f"notifications:{user_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "HEARTBEAT":
                await websocket.send_json({"type": "HEARTBEAT_ACK"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@ws_router.websocket("/ws/pos/{branch_id}")
async def ws_pos(websocket: WebSocket, branch_id: str, token: str = Query(...)):
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.close(code=4001)
        return
    channel = f"pos:{branch_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "HEARTBEAT":
                await websocket.send_json({"type": "HEARTBEAT_ACK"})
            elif data.get("type") == "REQUEST_STOCK_UPDATE":
                await websocket.send_json({"type": "STOCK_UPDATE_QUEUED", "medicine_ids": data.get("medicine_ids", [])})
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@ws_router.websocket("/ws/prescriptions")
async def ws_prescriptions(websocket: WebSocket, token: str = Query(...)):
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.close(code=4001)
        return
    channel = f"prescriptions:{user_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@ws_router.websocket("/ws/dashboard/{branch_id}")
async def ws_dashboard(websocket: WebSocket, branch_id: str, token: str = Query(...)):
    user_id = await authenticate_ws(token)
    if not user_id:
        await websocket.close(code=4001)
        return
    channel = f"dashboard:{branch_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
