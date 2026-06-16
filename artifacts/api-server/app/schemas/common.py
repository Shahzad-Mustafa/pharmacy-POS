from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    pages: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: PaginationMeta


class MessageResponse(BaseModel):
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None
    status: int


class ErrorResponse(BaseModel):
    error: ErrorDetail


def paginate(items: List[Any], total: int, page: int, per_page: int) -> dict:
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    return {
        "data": items,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
    }
