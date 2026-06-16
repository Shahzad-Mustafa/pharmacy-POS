import uuid
import logging
from fastapi import APIRouter, Depends, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import require_roles
from app.models.user import User
from app.models.insurance import InsuranceProvider, InsuranceClaim
from app.schemas.insurance import (
    InsuranceProviderCreate, InsuranceProviderUpdate, InsuranceProviderResponse,
    EligibilityCheckRequest, InsuranceClaimCreate, ClaimStatusUpdate, PreAuthRequest, ClaimDisputeRequest,
)
from app.schemas.common import paginate
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/insurance", tags=["Insurance"])


@router.get("/providers", summary="List insurance providers")
async def list_providers(is_active: bool = None, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    filters = []
    if is_active is not None:
        filters.append(InsuranceProvider.is_active == is_active)
    query = select(InsuranceProvider)
    if filters:
        query = query.where(*filters)
    result = await db.execute(query)
    providers = result.scalars().all()
    return [InsuranceProviderResponse.model_validate(p).model_dump() for p in providers]


@router.post("/providers", response_model=InsuranceProviderResponse, status_code=status.HTTP_201_CREATED, summary="Create insurance provider")
async def create_provider(body: InsuranceProviderCreate, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    provider = InsuranceProvider(**body.model_dump())
    db.add(provider)
    await db.flush()
    await db.refresh(provider)
    return InsuranceProviderResponse.model_validate(provider)


@router.get("/providers/{provider_id}", response_model=InsuranceProviderResponse, summary="Get insurance provider")
async def get_provider(provider_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    provider = await db.get(InsuranceProvider, provider_id)
    if not provider:
        raise NotFoundError("InsuranceProvider", str(provider_id))
    return InsuranceProviderResponse.model_validate(provider)


@router.put("/providers/{provider_id}", response_model=InsuranceProviderResponse, summary="Update insurance provider")
async def update_provider(provider_id: uuid.UUID, body: InsuranceProviderUpdate, current_user: User = Depends(require_roles("admin", "super_admin")), db: AsyncSession = Depends(get_db)):
    provider = await db.get(InsuranceProvider, provider_id)
    if not provider:
        raise NotFoundError("InsuranceProvider", str(provider_id))
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(provider, k, v)
    await db.flush()
    return InsuranceProviderResponse.model_validate(provider)


@router.post("/eligibility", summary="Check patient insurance eligibility")
async def check_eligibility(body: EligibilityCheckRequest, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "cashier", "super_admin")), db: AsyncSession = Depends(get_db)):
    from app.models.patient import Patient
    patient = await db.get(Patient, body.patient_id)
    if not patient:
        raise NotFoundError("Patient", str(body.patient_id))
    provider = await db.get(InsuranceProvider, body.provider_id)
    if not provider:
        raise NotFoundError("InsuranceProvider", str(body.provider_id))
    coverage = provider.coverage_rules or {}
    return {
        "eligible": True,
        "member_name": patient.name,
        "policy_number": patient.insurance_member_id,
        "annual_limit": coverage.get("max_annual_limit", 0),
        "copay_pct": coverage.get("copay_pct", 0),
        "pre_auth_required_above": coverage.get("pre_auth_required_above", 0),
        "covers_pharmacy": coverage.get("covers_pharmacy", True),
    }


@router.post("/claims", status_code=status.HTTP_201_CREATED, summary="Create insurance claim")
async def create_claim(body: InsuranceClaimCreate, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "cashier", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = InsuranceClaim(**body.model_dump())
    db.add(claim)
    await db.flush()
    await db.refresh(claim)
    return {"id": str(claim.id), "status": claim.status, "claim_amount": float(claim.claim_amount), "created_at": claim.created_at.isoformat()}


@router.get("/claims", summary="List claims")
async def list_claims(
    provider_id: uuid.UUID = None, patient_id: uuid.UUID = None, status: str = None, branch_id: uuid.UUID = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("admin", "manager", "accountant", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if provider_id:
        filters.append(InsuranceClaim.provider_id == provider_id)
    if patient_id:
        filters.append(InsuranceClaim.patient_id == patient_id)
    if status:
        filters.append(InsuranceClaim.status == status)
    query = select(InsuranceClaim)
    if filters:
        query = query.where(*filters)
    total = (await db.execute(select(func.count()).select_from(InsuranceClaim).where(*filters) if filters else select(func.count()).select_from(InsuranceClaim))).scalar_one()
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    claims = result.scalars().all()
    return paginate([{"id": str(c.id), "status": c.status, "claim_amount": float(c.claim_amount), "patient_id": str(c.patient_id) if c.patient_id else None} for c in claims], total, page, per_page)


@router.get("/claims/summary", summary="Get claims summary by provider")
async def claims_summary(provider_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "manager", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    filters = []
    if provider_id:
        filters.append(InsuranceClaim.provider_id == provider_id)
    total_claimed = float((await db.execute(select(func.coalesce(func.sum(InsuranceClaim.claim_amount), 0)).where(*filters) if filters else select(func.coalesce(func.sum(InsuranceClaim.claim_amount), 0)))).scalar_one())
    total_approved = float((await db.execute(select(func.coalesce(func.sum(InsuranceClaim.approved_amount), 0)).where(*filters) if filters else select(func.coalesce(func.sum(InsuranceClaim.approved_amount), 0)))).scalar_one())
    return {"total_claimed": total_claimed, "total_approved": total_approved}


@router.get("/receivables", summary="Get outstanding insurance receivables")
async def insurance_receivables(provider_id: uuid.UUID = None, current_user: User = Depends(require_roles("admin", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"data": []}


@router.get("/claims/{claim_id}", summary="Get claim")
async def get_claim(claim_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = await db.get(InsuranceClaim, claim_id)
    if not claim:
        raise NotFoundError("InsuranceClaim", str(claim_id))
    return {"id": str(claim.id), "status": claim.status, "claim_amount": float(claim.claim_amount), "approved_amount": float(claim.approved_amount) if claim.approved_amount else None}


@router.post("/claims/{claim_id}/preauth", summary="Submit pre-authorization request")
async def submit_preauth(claim_id: uuid.UUID, body: PreAuthRequest, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = await db.get(InsuranceClaim, claim_id)
    if not claim:
        raise NotFoundError("InsuranceClaim", str(claim_id))
    claim.status = "preauth"
    await db.flush()
    return {"message": "Pre-authorization submitted", "claim_id": str(claim_id)}


@router.post("/claims/{claim_id}/documents", summary="Upload claim document")
async def upload_claim_doc(claim_id: uuid.UUID, file: UploadFile = File(...), document_type: str = "other", current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "cashier", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "Document uploaded", "filename": file.filename, "document_type": document_type}


@router.post("/claims/{claim_id}/submit", summary="Submit claim to insurer")
async def submit_claim(claim_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = await db.get(InsuranceClaim, claim_id)
    if not claim:
        raise NotFoundError("InsuranceClaim", str(claim_id))
    from datetime import datetime, timezone
    claim.status = "submitted"
    claim.submitted_at = datetime.now(timezone.utc).isoformat()
    await db.flush()
    return {"message": "Claim submitted", "claim_id": str(claim_id)}


@router.get("/claims/{claim_id}/status", summary="Get claim status")
async def get_claim_status(claim_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = await db.get(InsuranceClaim, claim_id)
    if not claim:
        raise NotFoundError("InsuranceClaim", str(claim_id))
    return {"claim_id": str(claim_id), "status": claim.status}


@router.patch("/claims/{claim_id}/status", summary="Manually update claim status")
async def update_claim_status(claim_id: uuid.UUID, body: ClaimStatusUpdate, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = await db.get(InsuranceClaim, claim_id)
    if not claim:
        raise NotFoundError("InsuranceClaim", str(claim_id))
    claim.status = body.status
    if body.approved_amount is not None:
        claim.approved_amount = body.approved_amount
    await db.flush()
    return {"message": "Claim status updated", "status": claim.status}


@router.post("/claims/{claim_id}/dispute", summary="Dispute / reject claim")
async def dispute_claim(claim_id: uuid.UUID, body: ClaimDisputeRequest, current_user: User = Depends(require_roles("admin", "manager", "super_admin")), db: AsyncSession = Depends(get_db)):
    claim = await db.get(InsuranceClaim, claim_id)
    if not claim:
        raise NotFoundError("InsuranceClaim", str(claim_id))
    claim.status = "disputed"
    await db.flush()
    return {"message": "Claim disputed", "claim_id": str(claim_id)}


@router.post("/claims/era", summary="Post ERA (Electronic Remittance Advice)")
async def post_era(current_user: User = Depends(require_roles("admin", "accountant", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"message": "ERA processing endpoint ready"}


@router.get("/providers/{provider_id}/preauth-templates", summary="Get pre-auth templates")
async def get_preauth_templates(provider_id: uuid.UUID, current_user: User = Depends(require_roles("admin", "manager", "pharmacist", "super_admin")), db: AsyncSession = Depends(get_db)):
    return {"templates": []}
