import uuid
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, AuditLog
from app.models.branch import Branch
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    def _with_branch(self, q):
        return q.options(selectinload(User.branch))

    async def get(self, id: uuid.UUID) -> Optional[User]:
        result = await self.db.execute(
            self._with_branch(select(User).where(User.id == id))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            self._with_branch(select(User).where(User.email == email))
        )
        return result.scalar_one_or_none()

    async def get_active_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            self._with_branch(select(User).where(User.email == email, User.is_active == True))
        )
        return result.scalar_one_or_none()

    async def list_users(self, page: int, per_page: int, role: str = None, branch_id: uuid.UUID = None, is_active: bool = None):
        query = self._with_branch(select(User))
        count_q = select(func.count()).select_from(User)
        filters = []
        if role:
            filters.append(User.role == role)
        if branch_id:
            filters.append(User.branch_id == branch_id)
        if is_active is not None:
            filters.append(User.is_active == is_active)
        if filters:
            query = query.where(*filters)
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)

    async def log(self, user_id, action: str, entity_type: str, entity_id: str = None,
                  before=None, after=None, ip: str = None, ua: str = None, notes: str = None):
        entry = AuditLog(
            user_id=user_id, action=action, entity_type=entity_type,
            entity_id=entity_id, before_data=before, after_data=after,
            ip_address=ip, user_agent=ua, notes=notes,
        )
        return await self.create(entry)
