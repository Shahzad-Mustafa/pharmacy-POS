import logging
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError, ConflictError, BadRequestError
from app.models.medicine import Medicine, MedicinePriceHistory
from app.repositories.medicine_repo import MedicineRepository
from app.repositories.inventory_repo import BatchRepository

logger = logging.getLogger(__name__)


class MedicineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MedicineRepository(db)

    async def create(self, data: dict, user_id: uuid.UUID) -> Medicine:
        if data.get("barcode"):
            existing = await self.repo.get_by_barcode(data["barcode"])
            if existing:
                raise ConflictError("BARCODE_ALREADY_EXISTS", f"Barcode {data['barcode']} already in use", "barcode")
        if data.get("drap_registration_no"):
            from sqlalchemy import select
            from app.models.medicine import Medicine as M
            result = await self.db.execute(
                select(M).where(M.drap_registration_no == data["drap_registration_no"])
            )
            if result.scalar_one_or_none():
                raise ConflictError("DRAP_REG_DUPLICATE", "DRAP registration number already exists", "drap_registration_no")
        med = Medicine(**data)
        return await self.repo.create(med)

    async def update(self, medicine_id: uuid.UUID, data: dict, user_id: uuid.UUID) -> Medicine:
        med = await self.repo.get(medicine_id)
        if not med:
            raise NotFoundError("Medicine", str(medicine_id))
        if data.get("barcode") and data["barcode"] != med.barcode:
            existing = await self.repo.get_by_barcode(data["barcode"])
            if existing:
                raise ConflictError("BARCODE_ALREADY_EXISTS", "Barcode already in use", "barcode")
        return await self.repo.update(med, {k: v for k, v in data.items() if v is not None})

    async def update_mrp(self, medicine_id: uuid.UUID, new_mrp: float, effective_date: str = None,
                          reason: str = None, user_id: uuid.UUID = None) -> Medicine:
        med = await self.repo.get(medicine_id)
        if not med:
            raise NotFoundError("Medicine", str(medicine_id))
        history = MedicinePriceHistory(
            medicine_id=medicine_id,
            old_mrp=float(med.mrp) if med.mrp else 0,
            new_mrp=new_mrp,
            effective_date=effective_date,
            reason=reason,
            changed_by_id=user_id,
        )
        self.db.add(history)
        med.mrp = new_mrp
        await self.db.flush()
        return med

    async def deactivate(self, medicine_id: uuid.UUID) -> None:
        med = await self.repo.get(medicine_id)
        if not med:
            raise NotFoundError("Medicine", str(medicine_id))
        med.is_active = False
        await self.db.flush()

    async def enrich_from_openfda(self, medicine_id: uuid.UUID, sources: list) -> dict:
        import httpx
        med = await self.repo.get(medicine_id)
        if not med:
            raise NotFoundError("Medicine", str(medicine_id))
        results = {"enriched": {}, "source_responses": {}}
        if "openfda" in sources and med.generic_name:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        "https://api.fda.gov/drug/label.json",
                        params={"search": f'generic_name:"{med.generic_name}"', "limit": 1},
                    )
                    if resp.status_code == 200:
                        results["source_responses"]["openfda"] = "ok"
                        fda_data = resp.json().get("results", [{}])[0]
                        results["enriched"]["boxed_warning"] = bool(fda_data.get("boxed_warning_date"))
                    else:
                        results["source_responses"]["openfda"] = "error"
            except Exception as e:
                logger.warning(f"openFDA enrichment failed: {e}")
                results["source_responses"]["openfda"] = "error"
        return results

    async def check_allergies(self, medicine_ids: list, patient_id: uuid.UUID) -> dict:
        from app.repositories.patient_repo import PatientRepository
        patient_repo = PatientRepository(self.db)
        patient = await patient_repo.get(patient_id)
        if not patient:
            raise NotFoundError("Patient", str(patient_id))
        patient_allergies = [a.lower() for a in (patient.allergies or [])]
        conflicts = []
        for med_id in medicine_ids:
            med = await self.repo.get(med_id)
            if not med:
                continue
            composition = (med.composition or "").lower()
            name = med.name.lower()
            for allergen in patient_allergies:
                if allergen in composition or allergen in name:
                    conflicts.append({"medicine": med.name, "allergen": allergen})
        return {"safe": len(conflicts) == 0, "conflicts": conflicts}
