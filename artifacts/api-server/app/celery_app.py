import logging
from celery import Celery
from celery.schedules import crontab
from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "rxpos",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"],
)

celery_app.conf.beat_schedule = {
    "check-low-stock": {
        "task": "app.tasks.check_low_stock",
        "schedule": crontab(minute=0),
    },
    "check-expiry-alerts": {
        "task": "app.tasks.check_expiry_alerts",
        "schedule": crontab(hour=7, minute=0),
    },
    "send-pending-notifications": {
        "task": "app.tasks.send_pending_notifications",
        "schedule": crontab(minute="*/5"),
    },
    "sync-quickbooks-daily": {
        "task": "app.tasks.sync_accounting_quickbooks",
        "schedule": crontab(hour=0, minute=0),
    },
    "cleanup-expired-tokens": {
        "task": "app.tasks.cleanup_expired_tokens",
        "schedule": crontab(hour=3, minute=0),
    },
    "generate-reorder-suggestions": {
        "task": "app.tasks.generate_reorder_suggestions",
        "schedule": crontab(hour=6, minute=0),
    },
    "database-backup": {
        "task": "app.tasks.database_backup",
        "schedule": crontab(hour=2, minute=0),
    },
}

celery_app.conf.timezone = "Asia/Karachi"
