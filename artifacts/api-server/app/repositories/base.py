import uuid
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: uuid.UUID) -> Optional[ModelType]:
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100, **filters) -> List[ModelType]:
        query = select(self.model)
        for key, val in filters.items():
            if val is not None:
                query = query.where(getattr(self.model, key) == val)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, **filters) -> int:
        query = select(func.count()).select_from(self.model)
        for key, val in filters.items():
            if val is not None:
                query = query.where(getattr(self.model, key) == val)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelType, data: Dict[str, Any]) -> ModelType:
        for key, val in data.items():
            if val is not None:
                setattr(obj, key, val)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        await self.db.delete(obj)
        await self.db.flush()

    async def get_paginated(self, page: int, per_page: int, **filters):
        skip = (page - 1) * per_page
        total = await self.count(**filters)
        items = await self.get_all(skip=skip, limit=per_page, **filters)
        return items, total
