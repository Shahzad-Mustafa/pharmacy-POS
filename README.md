# RxPOS — Precision Pharmacy Workstation

A production-grade dual-mode (Retail + Hospital) Pharmacy Point-of-Sale system.

**Stack:** React 19 + Vite frontend · FastAPI (Python 3.12) backend · PostgreSQL 16 · Redis 7 · Celery

---

## Quick Start (Docker — recommended)

```bash
cp .env.example .env          # fill in SESSION_SECRET at minimum
docker-compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000/api/docs
- API Health → http://localhost:8000/api/healthz

---

## Manual Setup (Development)

### 1 — Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node.js | 22+ |
| pnpm | 11+ |
| PostgreSQL | 16+ |
| Redis | 7+ |

### 2 — Clone & Install

```bash
git clone <repo-url>
cd pharmacy-POS

# Python dependencies
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r artifacts/api-server/requirements.txt

# Node dependencies
pnpm install
```

### 3 — Environment

```bash
cp .env.example artifacts/api-server/.env
# Edit artifacts/api-server/.env and set:
#   DATABASE_URL=postgresql://user:password@localhost:5432/rxpos
#   SESSION_SECRET=<random 32-char string>
#   REDIS_URL=redis://localhost:6379/0
```

Generate a secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 4 — Database Setup

```bash
# Create the database
createdb rxpos

# Run migrations
cd artifacts/api-server
DATABASE_URL=postgresql://user:password@localhost:5432/rxpos \
  ../../venv/bin/alembic upgrade head

# Seed with demo data
DATABASE_URL=postgresql://user:password@localhost:5432/rxpos \
  ../../venv/bin/python seed.py
cd ../..
```

### 5 — Run the Backend

```bash
cd artifacts/api-server
DATABASE_URL=postgresql://user:password@localhost:5432/rxpos \
SESSION_SECRET=your-secret-key \
  ../../venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API is available at **http://localhost:8000/api**
Interactive docs at **http://localhost:8000/api/docs**

### 6 — Run the Frontend

```bash
# In a new terminal, from the project root:
pnpm --filter @workspace/pharmacy-pos run dev
```

Frontend is available at **http://localhost:5173**

### 7 — Run Celery Worker (optional — for async tasks)

```bash
cd artifacts/api-server
DATABASE_URL=postgresql://... REDIS_URL=redis://localhost:6379/0 \
  ../../venv/bin/celery -A app.celery_app worker --loglevel=info
```

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@rxpos.pk | admin123 |
| Cashier | cashier@rxpos.pk | cashier123 |
| Pharmacist | pharmacist@rxpos.pk | cashier123 |
| Manager | manager@rxpos.pk | manager123 |

---

## Project Structure

```
pharmacy-POS/
├── artifacts/
│   ├── api-server/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/v1/      # Route handlers (one file per module)
│   │   │   ├── models/      # SQLAlchemy ORM models
│   │   │   ├── schemas/     # Pydantic request/response schemas
│   │   │   ├── services/    # Business logic
│   │   │   ├── repositories/# Database queries
│   │   │   └── core/        # Security, Redis, exceptions
│   │   ├── alembic/         # Database migrations
│   │   ├── seed.py          # Demo data seeder
│   │   └── requirements.txt
│   └── pharmacy-pos/        # React frontend
│       └── src/
│           ├── pages/       # One file per page/route
│           ├── components/  # Shared UI components
│           └── hooks/       # Custom React hooks
├── lib/
│   ├── api-spec/            # OpenAPI YAML spec (source of truth)
│   ├── api-client-react/    # Generated React Query hooks
│   └── db/                  # Drizzle ORM (legacy, unused)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Available Pages

| Page | URL | Access |
|------|-----|--------|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All staff |
| Point of Sale | `/pos` | All staff |
| Prescriptions | `/prescriptions` | Pharmacist+ |
| Medicines | `/medicines` | Pharmacist+ |
| Inventory | `/inventory` | Pharmacist+ |
| Patients | `/patients` | All staff |
| Sales History | `/sales` | All staff |
| Suppliers | `/suppliers` | Manager+ |
| Branches | `/branches` | Manager+ |
| Staff | `/users` | Admin+ |
| Reports | `/reports` | Pharmacist+ |
| Insurance | `/insurance` | Pharmacist+ |
| Notifications | `/notifications` | All staff |
| Settings | `/settings` | Admin+ |

---

## Useful Commands

```bash
# Re-generate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Typecheck everything
pnpm run typecheck

# Create a new Alembic migration after model changes
cd artifacts/api-server
DATABASE_URL=... ../../venv/bin/alembic revision --autogenerate -m "description"

# Apply pending migrations
cd artifacts/api-server
DATABASE_URL=... ../../venv/bin/alembic upgrade head

# Re-seed the database (clears existing data)
cd artifacts/api-server
DATABASE_URL=... ../../venv/bin/python seed.py
```
