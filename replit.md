# RxPOS — Precision Pharmacy Workstation

A full dual-mode (Retail + Hospital) Pharmacy Point-of-Sale system built with React/Vite frontend, Express 5 API, and PostgreSQL.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000/8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with demo data
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Login Credentials (seeded)

- Admin: `admin@rxpos.pk` / `admin123`
- Cashier: `cashier@rxpos.pk` / `cashier123`
- Pharmacist: `pharmacist@rxpos.pk` / `cashier123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui + Wouter routing + Recharts
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI contract
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-client-react/src/generated/api.schemas.ts` — generated TypeScript types
- `lib/db/src/schema/` — Drizzle ORM schema (one file per table)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/pharmacy-pos/src/pages/` — all frontend page components
- `scripts/src/seed.ts` — database seed script

## Architecture decisions

- Contract-first: OpenAPI spec drives all type generation (no manual type duplication)
- JWT auth with bcrypt password hashing; tokens stored in localStorage via auth context
- All `req.params.xxx` values must be wrapped with `String()` in Express 5 (typed as `string | string[]`)
- bcryptjs must use default import (`import bcrypt from 'bcryptjs'`) not namespace import
- Orval collision: endpoints with both path params AND query params need query params removed from spec

## Product

- Login with role-based access (admin, pharmacist, cashier, manager, super_admin)
- Dashboard with revenue charts and KPIs
- Point of Sale (POS) — cart, patient search, prescription linking, cash/card/credit payment
- Medicine catalog with CRUD, Rx/OTC flag, categories
- Inventory — batches, stock adjustments, reorder suggestions, stock valuation
- Patient registry with allergy tracking, chronic conditions, purchase history
- Prescription queue — verify → fill → dispense workflow
- Sales history with date filtering and refunds
- Suppliers with purchase orders, GRNs, payables aging
- Branch management with per-branch stock summary
- Staff management (users) with role assignment
- Reports — daily summary, revenue trend, top medicines, prescription stats

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Express 5 types `req.params` as `string | string[]` — always wrap with `String()` before passing to Drizzle
- bcryptjs ESM import must be default: `import bcrypt from 'bcryptjs'`
- Orval will fail if endpoints have both path AND query params — remove query params from those routes
- `scripts` package needs `@workspace/db`, `drizzle-orm` declared as explicit dependencies
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
