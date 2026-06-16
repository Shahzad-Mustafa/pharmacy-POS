import uuid
import logging
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, ChronicMedicationsUpdate, AllergiesUpdate, PatientMergeRequest
from app.schemas.common import paginate
from app.repositories.patient_repo import PatientRepository
from app.core.exceptions import NotFoundError, ConflictError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patients", tags=["Patients"])

PATIENT_ROLES = ("admin", "manager", "pharmacist", "cashier", "super_admin")


@router.get("", summary="List patients")
async def list_patients(
    customer_type: str = None, branch_id: uuid.UUID = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*PATIENT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    patients, total = await repo.list_patients(customer_type=customer_type, branch_id=branch_id, page=page, per_page=per_page)
    return paginate([PatientResponse.model_validate(p).model_dump() for p in patients], total, page, per_page)


@router.get("/search", summary="Search patients")
async def search_patients(
    q: str = None, cnic: str = None, phone: str = None, mrn: str = None, insurance_member_id: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*PATIENT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    patients, total = await repo.search(q=q, cnic=cnic, phone=phone, mrn=mrn, insurance_member_id=insurance_member_id, page=page, per_page=per_page)
    return [PatientResponse.model_validate(p).model_dump() for p in patients]


@router.post("/merge", summary="Merge duplicate patients")
async def merge_patients(
    body: PatientMergeRequest,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.patient import Patient
    keep = await db.get(Patient, body.keep_id)
    merge = await db.get(Patient, body.merge_id)
    if not keep or not merge:
        raise NotFoundError("Patient", "one or both IDs not found")
    merge.is_active = False
    await db.flush()
    return {"message": f"Patient {body.merge_id} merged into {body.keep_id}"}


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED, summary="Create patient")
async def create_patient(
    body: PatientCreate,
    current_user: User = Depends(require_roles(*PATIENT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    if body.cnic:
        existing = await repo.get_by_cnic(body.cnic)
        if existing:
            raise ConflictError("CNIC_ALREADY_EXISTS", f"Patient with CNIC {body.cnic} already exists", "cnic")
    from app.models.patient import Patient
    patient = Patient(**body.model_dump(exclude={"emergency_contact"}, exclude_none=False))
    if body.emergency_contact:
        patient.emergency_contact = body.emergency_contact.model_dump()
    result = await repo.create(patient)
    return PatientResponse.model_validate(result)


@router.get("/{patient_id}", response_model=PatientResponse, summary="Get patient full profile")
async def get_patient(patient_id: uuid.UUID, current_user: User = Depends(require_roles(*PATIENT_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    return PatientResponse.model_validate(patient)


@router.put("/{patient_id}", response_model=PatientResponse, summary="Update patient")
async def update_patient(
    patient_id: uuid.UUID, body: PatientUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    data = body.model_dump(exclude_none=True)
    if "emergency_contact" in data and data["emergency_contact"]:
        data["emergency_contact"] = data["emergency_contact"]
    updated = await repo.update(patient, data)
    return PatientResponse.model_validate(updated)


@router.delete("/{patient_id}", summary="Soft-delete patient")
async def delete_patient(
    patient_id: uuid.UUID,
    current_user: User = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    patient.is_active = False
    await db.flush()
    return {"message": "Patient deactivated"}


@router.get("/{patient_id}/history", summary="Get patient purchase history")
async def patient_history(
    patient_id: uuid.UUID, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*PATIENT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.sale import Sale
    query = select(Sale).where(Sale.patient_id == patient_id, Sale.status == "completed")
    count_q = select(func.count()).select_from(Sale).where(Sale.patient_id == patient_id, Sale.status == "completed")
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    sales = result.scalars().all()
    return paginate([{"id": str(s.id), "invoice_number": s.invoice_number, "total": float(s.total), "created_at": s.created_at.isoformat()} for s in sales], total, page, per_page)


@router.get("/{patient_id}/prescriptions", summary="Get patient prescriptions")
async def patient_prescriptions(
    patient_id: uuid.UUID, status: str = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(*PATIENT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, func
    from app.models.prescription import Prescription
    filters = [Prescription.patient_id == patient_id]
    if status:
        filters.append(Prescription.status == status)
    total = (await db.execute(select(func.count()).select_from(Prescription).where(*filters))).scalar_one()
    result = await db.execute(select(Prescription).where(*filters).offset((page - 1) * per_page).limit(per_page))
    rxs = result.scalars().all()
    return paginate([{"id": str(r.id), "status": r.status, "prescriber_name": r.prescriber_name, "prescription_date": r.prescription_date.isoformat() if r.prescription_date else None} for r in rxs], total, page, per_page)


@router.get("/{patient_id}/chronic-medications", summary="Get chronic medications")
async def get_chronic_meds(patient_id: uuid.UUID, current_user: User = Depends(require_roles(*PATIENT_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    return {"medications": patient.chronic_medications or []}


@router.put("/{patient_id}/chronic-medications", summary="Update chronic medications")
async def update_chronic_meds(
    patient_id: uuid.UUID, body: ChronicMedicationsUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "doctor", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    patient.chronic_medications = body.medications
    await db.flush()
    return {"medications": body.medications}


@router.get("/{patient_id}/allergies", summary="Get patient allergies")
async def get_allergies(patient_id: uuid.UUID, current_user: User = Depends(require_roles(*PATIENT_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    return {"allergies": patient.allergies or []}


@router.put("/{patient_id}/allergies", summary="Update patient allergies")
async def update_allergies(
    patient_id: uuid.UUID, body: AllergiesUpdate,
    current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "doctor", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    patient.allergies = body.allergies
    await db.flush()
    return {"allergies": body.allergies}


@router.get("/{patient_id}/loyalty", summary="Get patient loyalty points")
async def get_loyalty(patient_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "cashier", "super_admin")), db: AsyncSession = Depends(get_db)):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    return {"patient_id": str(patient_id), "loyalty_points": patient.loyalty_points}


@router.get("/{patient_id}/insurance", summary="Get patient insurance details")
async def get_insurance(patient_id: uuid.UUID, current_user: User = Depends(require_roles(*PATIENT_ROLES)), db: AsyncSession = Depends(get_db)):
    repo = PatientRepository(db)
    patient = await repo.get(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    return {"insurance_provider_id": str(patient.insurance_provider_id) if patient.insurance_provider_id else None, "insurance_member_id": patient.insurance_member_id}


@router.get("/{patient_id}/statement", summary="Get patient account statement")
async def get_statement(patient_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select, func
    from app.models.sale import Sale
    total_billed = (await db.execute(select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.patient_id == patient_id, Sale.status == "completed"))).scalar_one()
    return {"patient_id": str(patient_id), "total_billed": float(total_billed), "paid": float(total_billed), "outstanding": 0.0}
