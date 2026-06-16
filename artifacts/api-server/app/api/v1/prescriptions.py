import uuid
import logging
from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.models.prescription import Prescription, PrescriptionItem
from app.schemas.prescription import (
    PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse,
    PrescriptionVerifyRequest, PrescriptionDispenseRequest,
    PrescriptionCancelRequest, PrescriptionRefillRequest,
)
from app.schemas.common import paginate
from app.core.exceptions import NotFoundError, BadRequestError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

RX_ROLES = ("admin", "manager", "pharmacist", "doctor", "super_admin")


async def _get_rx(db: AsyncSession, rx_id: uuid.UUID) -> Prescription:
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(Prescription).options(selectinload(Prescription.items)).where(Prescription.id == rx_id))
    rx = result.scalar_one_or_none()
    if not rx:
        raise NotFoundError("Prescription", str(rx_id))
    return rx


@router.get("", summary="List prescriptions")
async def list_prescriptions(
    patient_id: uuid.UUID = None, doctor_id: uuid.UUID = None,
    status: str = None, source: str = None, branch_id: uuid.UUID = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*RX_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if patient_id:
        filters.append(Prescription.patient_id == patient_id)
    if doctor_id:
        filters.append(Prescription.doctor_id == doctor_id)
    if status:
        filters.append(Prescription.status == status)
    if source:
        filters.append(Prescription.source == source)
    if branch_id:
        filters.append(Prescription.branch_id == branch_id)
    query = select(Prescription)
    if filters:
        query = query.where(*filters)
    total = (await db.execute(select(func.count()).select_from(Prescription).where(*filters) if filters else select(func.count()).select_from(Prescription))).scalar_one()
    from sqlalchemy.orm import selectinload
    result = await db.execute(query.options(selectinload(Prescription.items)).offset((page - 1) * per_page).limit(per_page))
    rxs = result.scalars().all()
    return paginate([PrescriptionResponse.model_validate(r).model_dump() for r in rxs], total, page, per_page)


@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED, summary="Create prescription")
async def create_prescription(
    body: PrescriptionCreate,
    current_user: User = Depends(require_roles(*RX_ROLES, "cashier")),
    db: AsyncSession = Depends(get_db),
):
    rx = Prescription(
        patient_id=body.patient_id,
        doctor_id=body.doctor_id,
        prescriber_name=body.prescriber_name,
        prescriber_license=body.prescriber_license,
        prescription_date=body.prescription_date,
        prescription_number=body.prescription_number,
        hospital_ward=body.hospital_ward,
        source=body.source,
        status="received",
        notes=body.notes,
        branch_id=body.branch_id,
    )
    db.add(rx)
    await db.flush()
    for item in body.items:
        pi = PrescriptionItem(prescription_id=rx.id, **item.model_dump())
        db.add(pi)
    await db.flush()
    result = await db.execute(select(Prescription).options(__import__("sqlalchemy.orm", fromlist=["selectinload"]).selectinload(Prescription.items)).where(Prescription.id == rx.id))
    return PrescriptionResponse.model_validate(result.scalar_one())


@router.get("/stats", summary="Prescription statistics")
async def rx_stats(
    branch_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")), db: AsyncSession = Depends(get_db)
):
    base_filters = []
    if branch_id:
        base_filters.append(Prescription.branch_id == branch_id)

    total = (await db.execute(
        select(func.count()).select_from(Prescription).where(*base_filters) if base_filters
        else select(func.count()).select_from(Prescription)
    )).scalar_one()

    statuses = ["received", "verified", "filled", "dispensed", "collected", "cancelled"]
    by_status = {}
    for st in statuses:
        filters = [*base_filters, Prescription.status == st]
        count = (await db.execute(select(func.count()).select_from(Prescription).where(*filters))).scalar_one()
        by_status[st] = int(count)

    dispensed = by_status.get("dispensed", 0) + by_status.get("collected", 0)
    pending = by_status.get("received", 0) + by_status.get("verified", 0) + by_status.get("filled", 0)

    return {
        "total": total,
        "dispensed": dispensed,
        "pending": pending,
        "dispensing_rate": dispensed / total if total else 0,
        "by_status": by_status,
    }


@router.get("/{prescription_id}", response_model=PrescriptionResponse, summary="Get prescription")
async def get_prescription(prescription_id: uuid.UUID, current_user: User = Depends(require_roles(*RX_ROLES)), db: AsyncSession = Depends(get_db)):
    return PrescriptionResponse.model_validate(await _get_rx(db, prescription_id))


@router.put("/{prescription_id}", response_model=PrescriptionResponse, summary="Update prescription")
async def update_prescription(
    prescription_id: uuid.UUID, body: PrescriptionUpdate,
    current_user: User = Depends(require_roles(*RX_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    rx = await _get_rx(db, prescription_id)
    if rx.status not in ("received", "verified"):
        raise BadRequestError("INVALID_STATUS", "Can only update prescriptions in received or verified status")
    for k, v in body.model_dump(exclude_none=True, exclude={"items"}).items():
        setattr(rx, k, v)
    await db.flush()
    return PrescriptionResponse.model_validate(await _get_rx(db, prescription_id))


@router.post("/{prescription_id}/cancel", summary="Cancel prescription")
async def cancel_prescription(
    prescription_id: uuid.UUID, body: PrescriptionCancelRequest,
    current_user: User = Depends(require_roles("admin", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    rx = await _get_rx(db, prescription_id)
    rx.status = "cancelled"
    rx.notes = (rx.notes or "") + f"\nCancelled: {body.reason}"
    await db.flush()
    return {"message": "Prescription cancelled", "prescription_id": str(prescription_id)}


@router.post("/{prescription_id}/verify", summary="Verify prescription")
async def verify_prescription(
    prescription_id: uuid.UUID, body: PrescriptionVerifyRequest,
    current_user: User = Depends(require_roles("pharmacist", "admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    rx = await _get_rx(db, prescription_id)
    rx.status = "verified"
    rx.verified_by_id = current_user.id
    rx.verified_at = datetime.now(timezone.utc)
    if body.notes:
        rx.notes = (rx.notes or "") + f"\nVerification: {body.notes}"
    await db.flush()
    return {"message": "Prescription verified", "status": "verified"}


@router.post("/{prescription_id}/fill", summary="Mark prescription as filled")
async def fill_prescription(prescription_id: uuid.UUID, current_user: User = Depends(require_roles("pharmacist", "admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    rx = await _get_rx(db, prescription_id)
    rx.status = "filled"
    await db.flush()
    return {"message": "Prescription marked as filled", "status": "filled"}


@router.post("/{prescription_id}/dispense", summary="Mark prescription as dispensed")
async def dispense_prescription(
    prescription_id: uuid.UUID, body: PrescriptionDispenseRequest,
    current_user: User = Depends(require_roles("pharmacist", "admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    rx = await _get_rx(db, prescription_id)
    rx.status = "dispensed"
    rx.dispensed_by_id = current_user.id
    rx.dispensed_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Prescription dispensed", "status": "dispensed"}


@router.post("/{prescription_id}/collect", summary="Mark prescription as collected")
async def collect_prescription(prescription_id: uuid.UUID, current_user: User = Depends(require_roles("pharmacist", "cashier", "admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    rx = await _get_rx(db, prescription_id)
    rx.status = "collected"
    await db.flush()
    return {"message": "Prescription collected", "status": "collected"}


@router.get("/{prescription_id}/refills", summary="Get prescription refill status")
async def get_refills(prescription_id: uuid.UUID, current_user: User = Depends(require_roles(*RX_ROLES)), db: AsyncSession = Depends(get_db)):
    rx = await _get_rx(db, prescription_id)
    return {"refills_allowed": rx.refills_allowed, "refills_used": rx.refills_used, "remaining": max(0, rx.refills_allowed - rx.refills_used)}


@router.post("/{prescription_id}/refill", summary="Request prescription refill")
async def request_refill(prescription_id: uuid.UUID, body: PrescriptionRefillRequest, current_user: User = Depends(require_roles("pharmacist", "cashier", "admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    rx = await _get_rx(db, prescription_id)
    if rx.refills_used >= rx.refills_allowed:
        raise BadRequestError("NO_REFILLS_REMAINING", "No refills remaining for this prescription")
    rx.refills_used += 1
    await db.flush()
    return {"message": "Refill requested", "refills_remaining": rx.refills_allowed - rx.refills_used}


@router.post("/import-ocr", summary="Import prescription via OCR")
async def import_ocr(
    file: UploadFile = File(...), patient_id: uuid.UUID = None,
    current_user: User = Depends(require_roles("pharmacist", "admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    return {"draft_prescription": {"items": [], "ocr_confidence": 0, "unmatched_drugs": []}, "ocr_provider": "manual", "message": "Configure OCR provider API keys to enable"}


@router.post("/import-fhir", summary="Import prescription via FHIR R4")
async def import_fhir(current_user: User = Depends(require_roles("pharmacist", "admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "FHIR R4 import endpoint ready"}


@router.post("/import-qr", summary="Import prescription via QR code")
async def import_qr(body: dict, current_user: User = Depends(require_roles("pharmacist", "cashier", "admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "QR import endpoint ready"}
