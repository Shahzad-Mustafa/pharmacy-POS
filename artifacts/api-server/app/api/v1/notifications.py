import uuid
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.notification import Notification, NotificationTemplate, NotificationLog, NotificationPreference
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", summary="List notifications (inbox)")
async def list_notifications(
    type: str = None, is_read: bool = None, unread: bool = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Notification.user_id == current_user.id]
    if type:
        filters.append(Notification.type == type)
    if is_read is not None:
        filters.append(Notification.is_read == is_read)
    elif unread is True:
        filters.append(Notification.is_read == False)
    query = select(Notification).where(*filters)
    total = (await db.execute(select(func.count()).select_from(Notification).where(*filters))).scalar_one()
    result = await db.execute(query.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page))
    notifs = result.scalars().all()
    from app.schemas.common import paginate
    return paginate([{
        "id": str(n.id),
        "type": n.type,
        "channel": n.channel or "inapp",
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "status": n.status or "sent",
        "data": n.data or {},
        "created_at": n.created_at.isoformat(),
    } for n in notifs], total, page, per_page)


@router.patch("/read-all", summary="Mark all notifications as read")
async def mark_all_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import update
    await db.execute(update(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False).values(is_read=True))
    await db.flush()
    return {"message": "All notifications marked as read"}


@router.patch("/{notification_id}/read", summary="Mark notification as read")
async def mark_read(notification_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    notif = await db.get(Notification, notification_id)
    if not notif:
        raise NotFoundError("Notification", str(notification_id))
    notif.is_read = True
    await db.flush()
    return {"message": "Notification marked as read"}


@router.get("/preferences", summary="Get notification preferences")
async def get_preferences(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == current_user.id))
    pref = result.scalar_one_or_none()
    raw = pref.preferences if pref else {}
    # Unwrap accidental double-nesting ({"preferences": {...}} stored instead of {...})
    if isinstance(raw, dict) and "preferences" in raw and len(raw) == 1 and isinstance(raw["preferences"], dict):
        raw = raw["preferences"]
    return {"preferences": raw}


@router.put("/preferences", summary="Update notification preferences")
async def update_preferences(body: dict, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Frontend sends {"preferences": {...}} — unwrap to store only the inner dict
    prefs_data = body.get("preferences", body)
    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == current_user.id))
    pref = result.scalar_one_or_none()
    if pref:
        pref.preferences = prefs_data
    else:
        pref = NotificationPreference(user_id=current_user.id, preferences=prefs_data)
        db.add(pref)
    await db.flush()
    return {"preferences": prefs_data}


@router.post("/send", summary="Send manual notification")
async def send_notification(body: dict, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Notification queued for dispatch"}


@router.get("/templates", summary="List notification templates")
async def list_templates(type: str = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    filters = []
    if type:
        filters.append(NotificationTemplate.type == type)
    query = select(NotificationTemplate)
    if filters:
        query = query.where(*filters)
    result = await db.execute(query)
    templates = result.scalars().all()
    return {"data": [{"id": str(t.id), "name": t.name, "type": t.type, "channel": t.channel} for t in templates]}


@router.post("/templates", status_code=status.HTTP_201_CREATED, summary="Create notification template")
async def create_template(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    template = NotificationTemplate(**{k: v for k, v in body.items() if hasattr(NotificationTemplate, k)})
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return {"id": str(template.id), "name": template.name}


@router.put("/templates/{template_id}", summary="Update notification template")
async def update_template(template_id: uuid.UUID, body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    template = await db.get(NotificationTemplate, template_id)
    if not template:
        raise NotFoundError("NotificationTemplate", str(template_id))
    for k, v in body.items():
        if hasattr(template, k):
            setattr(template, k, v)
    await db.flush()
    return {"message": "Template updated"}


@router.get("/log", summary="Get notification dispatch log")
async def notification_log(
    channel: str = None, status: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "manager", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if channel:
        filters.append(NotificationLog.channel == channel)
    if status:
        filters.append(NotificationLog.status == status)
    query = select(NotificationLog)
    if filters:
        query = query.where(*filters)
    total = (await db.execute(select(func.count()).select_from(NotificationLog).where(*filters) if filters else select(func.count()).select_from(NotificationLog))).scalar_one()
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()
    from app.schemas.common import paginate
    return paginate([{"id": str(l.id), "channel": l.channel, "status": l.status, "created_at": l.created_at.isoformat()} for l in logs], total, page, per_page)


@router.post("/log/{log_id}/retry", summary="Retry failed notification")
async def retry_notification(log_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    log = await db.get(NotificationLog, log_id)
    if not log:
        raise NotFoundError("NotificationLog", str(log_id))
    log.status = "pending"
    await db.flush()
    return {"message": "Notification queued for retry"}
