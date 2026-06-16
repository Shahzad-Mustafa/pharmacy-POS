from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, field: str = None):
        self.error_code = code
        self.error_message = message
        self.error_field = field
        detail = {"error": {"code": code, "message": message, "field": field, "status": status_code}}
        super().__init__(status_code=status_code, detail=detail)


class NotFoundError(AppException):
    def __init__(self, entity: str, identifier: str = None):
        msg = f"{entity} not found"
        if identifier:
            msg = f"{entity} with id {identifier} does not exist"
        super().__init__(404, f"{entity.upper().replace(' ', '_')}_NOT_FOUND", msg)


class ConflictError(AppException):
    def __init__(self, code: str, message: str, field: str = None):
        super().__init__(409, code, message, field)


class ValidationError(AppException):
    def __init__(self, code: str, message: str, field: str = None):
        super().__init__(422, code, message, field)


class AuthError(AppException):
    def __init__(self, code: str, message: str):
        super().__init__(401, code, message)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(403, "FORBIDDEN", message)


class BadRequestError(AppException):
    def __init__(self, code: str, message: str, field: str = None):
        super().__init__(400, code, message, field)
