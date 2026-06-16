import uuid
import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import require_roles
from app.models.user import User, AuditLog
from app.schemas.common import paginate
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("", summary="List audit logs")
async def list_audit_logs(
    user_id: uuid.UUID = None, action: str = None, entity_type: str = None,
    entity_id: str = None, ip_address: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if user_id:
        filters.append(AuditLog.user_id == user_id)
    if action:
        filters.append(AuditLog.action == action)
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if entity_id:
        filters.append(AuditLog.entity_id == entity_id)
    if ip_address:
        filters.append(AuditLog.ip_address == ip_address)
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    count_q = select(func.count()).select_from(AuditLog)
    if filters:
        query = query.where(*filters)
        count_q = count_q.where(*filters)
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()
    return paginate([{"id": str(l.id), "user_id": str(l.user_id) if l.user_id else None, "action": l.action, "entity_type": l.entity_type, "entity_id": l.entity_id, "ip": l.ip_address, "created_at": l.created_at.isoformat()} for l in logs], total, page, per_page)


@router.get("/entity/{entity_type}/{entity_id}", summary="Get entity audit trail")
async def entity_trail(
    entity_type: str, entity_id: str,
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuditLog).where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id).order_by(AuditLog.created_at.desc()))
    logs = result.scalars().all()
    return {"data": [{"id": str(l.id), "action": l.action, "before": l.before_data, "after": l.after_data, "ip": l.ip_address, "created_at": l.created_at.isoformat()} for l in logs]}


@router.get("/{log_id}", summary="Get audit log entry")
async def get_audit_log(log_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    log = await db.get(AuditLog, log_id)
    if not log:
        raise NotFoundError("AuditLog", str(log_id))
    return {"id": str(log.id), "user_id": str(log.user_id) if log.user_id else None, "action": log.action, "entity_type": log.entity_type, "entity_id": log.entity_id, "before": log.before_data, "after": log.after_data, "ip": log.ip_address, "ua": log.user_agent, "created_at": log.created_at.isoformat()}


@router.get("/export", summary="Export audit logs")
async def export_audit(from_date: str = None, to_date: str = None, entity_type: str = None, format: str = "csv", current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Audit log export endpoint ready", "format": format}
