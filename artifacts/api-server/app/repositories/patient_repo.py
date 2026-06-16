import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.repositories.base import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    def __init__(self, db: AsyncSession):
        super().__init__(Patient, db)

    async def search(self, q: str = None, cnic: str = None, phone: str = None,
                     mrn: str = None, insurance_member_id: str = None,
                     page: int = 1, per_page: int = 20) -> Tuple[List[Patient], int]:
        filters = [Patient.is_active == True]
        if q:
            filters.append(Patient.name.ilike(f"%{q}%"))
        if cnic:
            filters.append(Patient.cnic == cnic)
        if phone:
            filters.append(Patient.phone.ilike(f"%{phone}%"))
        if mrn:
            filters.append(Patient.mrn == mrn)
        if insurance_member_id:
            filters.append(Patient.insurance_member_id == insurance_member_id)
        query = select(Patient).where(*filters)
        count_q = select(func.count()).select_from(Patient).where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset((page - 1) * per_page).limit(per_page))
        return list(result.scalars().all()), total

    async def get_by_cnic(self, cnic: str) -> Optional[Patient]:
        result = await self.db.execute(select(Patient).where(Patient.cnic == cnic))
        return result.scalar_one_or_none()

    async def list_patients(self, customer_type: str = None, branch_id: uuid.UUID = None,
                             page: int = 1, per_page: int = 20) -> Tuple[List[Patient], int]:
        filters = [Patient.is_active == True]
        if customer_type:
            filters.append(Patient.customer_type == customer_type)
        if branch_id:
            filters.append(Patient.branch_id == branch_id)
        query = select(Patient).where(*filters)
        count_q = select(func.count()).select_from(Patient).where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset((page - 1) * per_page).limit(per_page))
        return list(result.scalars().all()), total
