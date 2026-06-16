import logging
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.check_low_stock")
def check_low_stock():
    """Check all branches for medicines below reorder point and send alerts."""
    logger.info("Running low stock check task")


@celery_app.task(name="app.tasks.check_expiry_alerts")
def check_expiry_alerts():
    """Find batches expiring in 30/60/90 days and notify managers."""
    logger.info("Running expiry alert check task")


@celery_app.task(name="app.tasks.sync_openfda_enrichments")
def sync_openfda_enrichments():
    """Re-enrich medicines that haven't been enriched in 30+ days."""
    logger.info("Running openFDA enrichment sync task")


@celery_app.task(name="app.tasks.send_pending_notifications")
def send_pending_notifications():
    """Pick pending notifications and dispatch via configured channels."""
    logger.info("Running pending notifications dispatch task")


@celery_app.task(name="app.tasks.sync_accounting_quickbooks")
def sync_accounting_quickbooks():
    """Auto-sync yesterday's sales/GRNs to QuickBooks if enabled."""
    logger.info("Running QuickBooks sync task")


@celery_app.task(name="app.tasks.sync_accounting_xero")
def sync_accounting_xero():
    """Auto-sync yesterday's sales/GRNs to Xero if enabled."""
    logger.info("Running Xero sync task")


@celery_app.task(name="app.tasks.poll_insurance_claim_status")
def poll_insurance_claim_status():
    """Poll X12 277 for submitted claims and update status."""
    logger.info("Running insurance claim status poll task")


@celery_app.task(name="app.tasks.generate_reorder_suggestions")
def generate_reorder_suggestions():
    """Run demand forecast and update suggested_reorder_qty on medicines."""
    logger.info("Running reorder suggestions generation task")


@celery_app.task(name="app.tasks.controlled_substance_reconciliation_reminder")
def controlled_substance_reconciliation_reminder():
    """Monthly reminder to admin/manager to run controlled substance reconciliation."""
    logger.info("Running controlled substance reconciliation reminder task")


@celery_app.task(name="app.tasks.cleanup_expired_tokens")
def cleanup_expired_tokens():
    """Remove expired JWT blacklist entries from Redis."""
    logger.info("Running expired token cleanup task")


@celery_app.task(name="app.tasks.database_backup")
def database_backup():
    """pg_dump → encrypt → upload to storage."""
    logger.info("Running database backup task")
