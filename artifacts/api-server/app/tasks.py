import asyncio
import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# How often to run checks (seconds). Default: every hour.
CHECK_INTERVAL = 3600


async def _run_notification_checks():
    """Check expiry alerts and low stock, insert Notification rows for all staff users."""
    from app.database import AsyncSessionLocal
    from app.models.notification import Notification, NotificationPreference
    from app.models.inventory import MedicineBatch
    from app.models.medicine import Medicine
    from app.models.user import User
    from sqlalchemy import select, func, and_
    import uuid

    async with AsyncSessionLocal() as db:
        try:
            today = date.today()
            warn_90 = today + timedelta(days=90)
            warn_30 = today + timedelta(days=30)

            # ── 1. Target users: admin / manager / pharmacist / super_admin ──────
            result = await db.execute(
                select(User).where(
                    User.role.in_(["admin", "manager", "pharmacist", "super_admin"]),
                    User.is_active == True,
                )
            )
            target_users: list[User] = result.scalars().all()
            if not target_users:
                return

            # Helper: check per-user preference flag
            pref_cache: dict[uuid.UUID, dict] = {}

            async def user_wants(user: User, notif_type: str) -> bool:
                if user.id not in pref_cache:
                    r = await db.execute(
                        select(NotificationPreference).where(
                            NotificationPreference.user_id == user.id
                        )
                    )
                    pref = r.scalar_one_or_none()
                    raw = pref.preferences if pref else {}
                    # Unwrap double-nested
                    if isinstance(raw, dict) and "preferences" in raw and len(raw) == 1:
                        raw = raw["preferences"]
                    pref_cache[user.id] = raw or {}
                prefs = pref_cache[user.id]
                # If no explicit preference set, default to enabled
                return prefs.get(notif_type, {}).get("app", True)

            # Helper: dedup key stored in notification data to avoid spam
            async def already_sent_today(user_id: uuid.UUID, dedup_key: str) -> bool:
                from sqlalchemy import cast, Date, literal
                r = await db.execute(
                    select(Notification).where(
                        Notification.user_id == user_id,
                        Notification.type.in_(["expiry_alert", "low_stock"]),
                        cast(Notification.created_at, Date) >= cast(literal(str(today)), Date),
                        Notification.data["dedup_key"].as_string() == dedup_key,
                    ).limit(1)
                )
                return r.scalar_one_or_none() is not None

            # ── 2. Expiry Alerts ─────────────────────────────────────────────────
            exp_result = await db.execute(
                select(MedicineBatch, Medicine)
                .join(Medicine, Medicine.id == MedicineBatch.medicine_id)
                .where(
                    MedicineBatch.expiry_date <= warn_90,
                    MedicineBatch.quantity > 0,
                    MedicineBatch.expiry_date.isnot(None),
                    Medicine.is_active == True,
                )
                .order_by(MedicineBatch.expiry_date)
            )
            expiring_batches = exp_result.fetchall()

            for batch, med in expiring_batches:
                days_left = (batch.expiry_date - today).days
                urgency = "critical" if days_left <= 30 else "warning"
                dedup_key = f"expiry_{batch.id}_{today}"

                for user in target_users:
                    if not await user_wants(user, "expiry_alert"):
                        continue
                    if await already_sent_today(user.id, dedup_key):
                        continue
                    if days_left < 0:
                        title = f"Expired: {med.name}"
                        message = f"Batch {batch.batch_number} of {med.name} expired {abs(days_left)} day(s) ago with {batch.quantity} units remaining."
                    else:
                        title = f"Expiring Soon: {med.name}"
                        message = f"Batch {batch.batch_number} of {med.name} expires in {days_left} day(s) ({batch.expiry_date}). Qty: {batch.quantity}."
                    db.add(Notification(
                        user_id=user.id,
                        type="expiry_alert",
                        channel="inapp",
                        title=title,
                        message=message,
                        is_read=False,
                        status="sent",
                        data={
                            "dedup_key": dedup_key,
                            "urgency": urgency,
                            "medicine_id": str(med.id),
                            "medicine_name": med.name,
                            "batch_id": str(batch.id),
                            "batch_number": batch.batch_number,
                            "expiry_date": str(batch.expiry_date),
                            "days_left": days_left,
                            "quantity": batch.quantity,
                        },
                    ))

            # ── 3. Low Stock Alerts ──────────────────────────────────────────────
            stock_result = await db.execute(
                select(Medicine, func.coalesce(func.sum(MedicineBatch.quantity), 0).label("qty"))
                .join(MedicineBatch, MedicineBatch.medicine_id == Medicine.id, isouter=True)
                .where(Medicine.is_active == True)
                .group_by(Medicine.id)
                .having(func.coalesce(func.sum(MedicineBatch.quantity), 0) <= Medicine.reorder_point)
            )
            low_stock_rows = stock_result.fetchall()

            for med, qty in low_stock_rows:
                dedup_key = f"low_stock_{med.id}_{today}"
                remaining = int(qty)
                urgency = "critical" if remaining == 0 else "warning"

                for user in target_users:
                    if not await user_wants(user, "low_stock"):
                        continue
                    if await already_sent_today(user.id, dedup_key):
                        continue
                    if remaining == 0:
                        title = f"Out of Stock: {med.name}"
                        message = f"{med.name} is completely out of stock. Reorder point: {med.reorder_point}."
                    else:
                        title = f"Low Stock: {med.name}"
                        message = f"{med.name} has only {remaining} unit(s) left (reorder point: {med.reorder_point})."
                    db.add(Notification(
                        user_id=user.id,
                        type="low_stock",
                        channel="inapp",
                        title=title,
                        message=message,
                        is_read=False,
                        status="sent",
                        data={
                            "dedup_key": dedup_key,
                            "urgency": urgency,
                            "medicine_id": str(med.id),
                            "medicine_name": med.name,
                            "current_stock": remaining,
                            "reorder_point": med.reorder_point,
                            "remaining": remaining,
                        },
                    ))

            await db.commit()
            logger.info(
                f"Notification check done — {len(expiring_batches)} expiring batches, "
                f"{len(low_stock_rows)} low-stock medicines checked."
            )
        except Exception as e:
            logger.error(f"Notification check failed: {e}", exc_info=True)
            await db.rollback()


async def notification_check_loop():
    """Runs immediately on startup, then repeats every CHECK_INTERVAL seconds."""
    # Short initial delay to let DB finish init
    await asyncio.sleep(5)
    while True:
        try:
            await _run_notification_checks()
        except Exception as e:
            logger.error(f"notification_check_loop error: {e}", exc_info=True)
        await asyncio.sleep(CHECK_INTERVAL)
