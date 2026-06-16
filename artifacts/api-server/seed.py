"""
Seed the database with demo data for RxPOS.
Run: python3 artifacts/api-server/seed.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse


def build_async_url(db_url: str) -> str:
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    parsed = urlparse(db_url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params.pop("sslmode", None)
    new_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=new_query))


async def seed():
    from app.database import Base
    from app.models import user, branch, medicine, inventory, patient, prescription, sale, supplier, insurance, notification, settings

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        return

    engine = create_async_engine(build_async_url(db_url), echo=False)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

    async with SessionLocal() as db:
        from sqlalchemy import select
        from app.models.user import User
        from app.models.branch import Branch
        from app.models.medicine import Medicine
        from app.models.patient import Patient
        import bcrypt as _bcrypt

        def hash_pw(pw: str) -> str:
            return _bcrypt.hashpw(pw.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")

        # Check if already seeded
        existing = await db.execute(select(User).where(User.email == "admin@rxpos.pk"))
        if existing.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            await engine.dispose()
            return

        # Create main branch
        main_branch = Branch(
            name="RxPOS Main Pharmacy",
            code="HQ",
            address="123 Main Street, Karachi",
            phone="+92-21-1234567",
            license_number="DRAP-PH-2024-001",
            is_active=True,
        )
        db.add(main_branch)
        await db.flush()

        branch2 = Branch(
            name="RxPOS North Branch",
            code="NB",
            address="456 North Road, Lahore",
            phone="+92-42-7654321",
            license_number="DRAP-PH-2024-002",
            is_active=True,
        )
        db.add(branch2)
        await db.flush()

        # Create users
        admin = User(
            name="System Admin",
            email="admin@rxpos.pk",
            hashed_password=hash_pw("admin123"),
            role="super_admin",
            is_active=True,
            branch_id=main_branch.id,
        )
        db.add(admin)
        await db.flush()

        cashier = User(
            name="Ali Cashier",
            email="cashier@rxpos.pk",
            hashed_password=hash_pw("cashier123"),
            role="cashier",
            is_active=True,
            branch_id=main_branch.id,
        )
        db.add(cashier)

        pharmacist = User(
            name="Dr. Sara Pharmacist",
            email="pharmacist@rxpos.pk",
            hashed_password=hash_pw("cashier123"),
            role="pharmacist",
            is_active=True,
            branch_id=main_branch.id,
        )
        db.add(pharmacist)

        manager = User(
            name="Ahmed Manager",
            email="manager@rxpos.pk",
            hashed_password=hash_pw("manager123"),
            role="manager",
            is_active=True,
            branch_id=main_branch.id,
        )
        db.add(manager)
        await db.flush()

        # Set branch manager
        main_branch.manager_id = admin.id
        await db.flush()

        # Create medicines
        medicines_data = [
            {"name": "Panadol 500mg", "generic_name": "Paracetamol", "brand": "GSK", "category": "Analgesics", "form": "Tablet", "strength": "500mg", "unit": "Strip", "pack_size": 10, "manufacturer": "GSK Pakistan", "requires_prescription": False, "mrp": 50.0, "reorder_point": 50, "min_stock_level": 20, "barcode": "6921804900024"},
            {"name": "Augmentin 625mg", "generic_name": "Amoxicillin+Clavulanic Acid", "brand": "GSK", "category": "Antibiotics", "form": "Tablet", "strength": "625mg", "unit": "Strip", "pack_size": 14, "manufacturer": "GSK Pakistan", "requires_prescription": True, "mrp": 450.0, "reorder_point": 30, "min_stock_level": 10},
            {"name": "Ciproxin 500mg", "generic_name": "Ciprofloxacin", "brand": "Bayer", "category": "Antibiotics", "form": "Tablet", "strength": "500mg", "unit": "Strip", "pack_size": 10, "manufacturer": "Bayer AG", "requires_prescription": True, "mrp": 320.0, "reorder_point": 20, "min_stock_level": 10},
            {"name": "Brufen 400mg", "generic_name": "Ibuprofen", "brand": "Abbott", "category": "NSAIDs", "form": "Tablet", "strength": "400mg", "unit": "Strip", "pack_size": 10, "manufacturer": "Abbott Pakistan", "requires_prescription": False, "mrp": 80.0, "reorder_point": 40, "min_stock_level": 15},
            {"name": "Flagyl 400mg", "generic_name": "Metronidazole", "brand": "Sanofi", "category": "Antibiotics", "form": "Tablet", "strength": "400mg", "unit": "Strip", "pack_size": 14, "manufacturer": "Sanofi Pakistan", "requires_prescription": True, "mrp": 120.0, "reorder_point": 25, "min_stock_level": 10},
            {"name": "Glucophage 500mg", "generic_name": "Metformin", "brand": "Merck", "category": "Antidiabetics", "form": "Tablet", "strength": "500mg", "unit": "Strip", "pack_size": 28, "manufacturer": "Merck Pakistan", "requires_prescription": True, "mrp": 280.0, "reorder_point": 30, "min_stock_level": 15},
            {"name": "Norvasc 5mg", "generic_name": "Amlodipine", "brand": "Pfizer", "category": "Antihypertensives", "form": "Tablet", "strength": "5mg", "unit": "Strip", "pack_size": 28, "manufacturer": "Pfizer Pakistan", "requires_prescription": True, "mrp": 350.0, "reorder_point": 20, "min_stock_level": 10},
            {"name": "ORS Sachet", "generic_name": "Oral Rehydration Salts", "brand": "WHO", "category": "OTC", "form": "Sachet", "strength": "N/A", "unit": "Box", "pack_size": 10, "manufacturer": "Various", "requires_prescription": False, "mrp": 40.0, "reorder_point": 50, "min_stock_level": 20},
            {"name": "Vitamin C 500mg", "generic_name": "Ascorbic Acid", "brand": "Sanofi", "category": "Vitamins", "form": "Tablet", "strength": "500mg", "unit": "Bottle", "pack_size": 100, "manufacturer": "Sanofi Pakistan", "requires_prescription": False, "mrp": 220.0, "reorder_point": 30, "min_stock_level": 10},
            {"name": "Omeprazole 20mg", "generic_name": "Omeprazole", "brand": "Ferozsons", "category": "Gastrology", "form": "Capsule", "strength": "20mg", "unit": "Strip", "pack_size": 14, "manufacturer": "Ferozsons", "requires_prescription": True, "mrp": 180.0, "reorder_point": 25, "min_stock_level": 10},
        ]

        med_objects = []
        for m in medicines_data:
            med = Medicine(**m)
            db.add(med)
            med_objects.append(med)
        await db.flush()

        # Create batches with stock
        from app.models.inventory import MedicineBatch
        from datetime import date, timedelta
        import random

        for med in med_objects:
            batch = MedicineBatch(
                medicine_id=med.id,
                branch_id=main_branch.id,
                batch_number=f"BTH-{med.name[:3].upper()}-2024",
                expiry_date=date.today() + timedelta(days=random.randint(180, 730)),
                manufacturing_date=date.today() - timedelta(days=90),
                quantity=random.randint(50, 200),
                purchase_price=float(med.mrp) * 0.7 if med.mrp else 100,
                selling_price=float(med.mrp) if med.mrp else 150,
            )
            db.add(batch)
        await db.flush()

        # Create patients
        patients_data = [
            {"name": "Muhammad Ali Khan", "phone": "0300-1234567", "cnic": "42201-1234567-1", "gender": "Male", "blood_group": "A+", "customer_type": "retail"},
            {"name": "Fatima Zahra Siddiqui", "phone": "0321-7654321", "cnic": "42201-7654321-2", "gender": "Female", "blood_group": "O+", "customer_type": "retail", "chronic_conditions": ["Diabetes", "Hypertension"]},
            {"name": "Ahmed Hassan", "phone": "0333-1111222", "gender": "Male", "customer_type": "hospital", "ward": "Cardiology"},
        ]

        for p_data in patients_data:
            patient = Patient(branch_id=main_branch.id, **p_data)
            db.add(patient)
        await db.flush()

        # Create a supplier
        from app.models.supplier import Supplier
        supplier = Supplier(
            name="Getz Pharma Pvt Ltd",
            contact_person="Sales Manager",
            phone="+92-21-111-438-9723",
            email="orders@getzpharma.com",
            address="Korangi Industrial Area, Karachi",
            credit_days=30,
            payment_terms="Net 30",
            is_active=True,
        )
        db.add(supplier)

        # System settings
        from app.models.settings import SystemSettings
        default_settings = [
            {"key": "pharmacy_name", "value": {"v": "RxPOS Pharmacy"}, "description": "Pharmacy name for receipts"},
            {"key": "tax_rate", "value": {"v": 0.17}, "description": "Default GST rate"},
            {"key": "currency", "value": {"v": "PKR"}, "description": "Currency"},
            {"key": "low_stock_alert_days", "value": {"v": 30}, "description": "Alert when stock covers < X days"},
            {"key": "expiry_alert_days", "value": {"v": [30, 60, 90]}, "description": "Alert at X days before expiry"},
        ]
        for s in default_settings:
            db.add(SystemSettings(**s))

        await db.commit()
        print("✅ Seed complete!")
        print("  Users: admin@rxpos.pk (admin123), cashier@rxpos.pk (cashier123), pharmacist@rxpos.pk (cashier123), manager@rxpos.pk (manager123)")
        print("  Branches: HQ (Main), NB (North)")
        print(f"  Medicines: {len(medicines_data)}")
        print(f"  Patients: {len(patients_data)}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
