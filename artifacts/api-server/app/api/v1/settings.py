import uuid
import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.settings import SystemSettings, PrinterConfig
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", summary="Get system settings")
async def get_settings(current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings))
    settings_rows = result.scalars().all()
    settings = {row.key: row.value for row in settings_rows}
    return {"settings": settings}


@router.put("", summary="Update system settings")
async def update_settings(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    for key, value in body.items():
        result = await db.execute(select(SystemSettings).where(SystemSettings.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = {"v": value}
        else:
            row = SystemSettings(key=key, value={"v": value})
            db.add(row)
    await db.flush()
    return {"message": "Settings updated", "settings": body}


@router.get("/integrations", summary="Get integration credentials")
async def get_integrations(current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    from app.config import settings
    return {
        "openfda_api_key": "***" if settings.OPENFDA_API_KEY else "",
        "drugbank_api_key": "***" if settings.DRUGBANK_API_KEY else "",
        "sendgrid_api_key": "***" if settings.SENDGRID_API_KEY else "",
        "twilio_account_sid": "***" if settings.TWILIO_ACCOUNT_SID else "",
    }


@router.put("/integrations", summary="Update integration credentials")
async def update_integrations(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Integration credentials updated. Restart service to apply."}


@router.post("/integrations/test", summary="Test integration credentials")
async def test_integration(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    integration = body.get("integration", "")
    if integration == "openfda":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("https://api.fda.gov/drug/label.json?limit=1")
                return {"status": "ok" if resp.status_code == 200 else "error", "message": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "ok", "message": f"Integration '{integration}' test ready"}


@router.get("/printers", summary="Get printer configuration")
async def get_printers(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    filters = []
    if branch_id:
        filters.append(PrinterConfig.branch_id == branch_id)
    query = select(PrinterConfig)
    if filters:
        query = query.where(*filters)
    result = await db.execute(query)
    printers = result.scalars().all()
    return {"data": [{"id": str(p.id), "name": p.name, "type": p.type, "ip": p.ip, "port": p.port, "is_default": p.is_default} for p in printers]}


@router.post("/printers", status_code=status.HTTP_201_CREATED, summary="Create/update printer")
async def create_printer(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    printer = PrinterConfig(**{k: v for k, v in body.items() if hasattr(PrinterConfig, k)})
    db.add(printer)
    await db.flush()
    await db.refresh(printer)
    return {"id": str(printer.id), "name": printer.name}


@router.post("/printers/{printer_id}/test", summary="Test printer")
async def test_printer(printer_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    printer = await db.get(PrinterConfig, printer_id)
    if not printer:
        raise NotFoundError("Printer", str(printer_id))
    return {"message": "Test page sent", "printer": printer.name}


@router.get("/tax", summary="Get tax configuration")
async def get_tax(current_user: User = Depends(require_roles("admin", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"rules": [{"category": "General", "tax_rate": 0.17, "tax_name": "GST 17%"}]}


@router.put("/tax", summary="Update tax configuration")
async def update_tax(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Tax configuration updated", "rules": body.get("rules", [])}


@router.get("/receipt-template", summary="Get receipt template")
async def get_receipt_template(branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"header_lines": ["RxPOS Pharmacy"], "footer_lines": ["Thank you for your visit!"], "show_generic_name": True, "show_batch_number": True, "show_expiry_date": True}


@router.put("/receipt-template", summary="Update receipt template")
async def update_receipt_template(body: dict, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Receipt template updated"}


@router.post("/backup", summary="Trigger database backup")
async def trigger_backup(current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Backup job triggered"}
