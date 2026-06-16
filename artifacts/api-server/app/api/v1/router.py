from fastapi import APIRouter
from app.api.v1 import auth, users, branches, medicines, inventory, patients, prescriptions, sales, suppliers, insurance, reports, notifications, audit, settings, accounting, dashboard

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(branches.router)
api_router.include_router(medicines.router)
api_router.include_router(inventory.router)
api_router.include_router(patients.router)
api_router.include_router(prescriptions.router)
api_router.include_router(sales.router)
api_router.include_router(suppliers.router)
api_router.include_router(insurance.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(settings.router)
api_router.include_router(accounting.router)
