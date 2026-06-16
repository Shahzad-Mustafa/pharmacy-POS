---
name: Frontend camelCase/snake_case field aliases
description: The FastAPI backend serializes in snake_case; some fields may appear in either case depending on serialization path
---

## The rule
Every field access from API responses must use double-alias pattern: `item.snake_case ?? item.camelCase`.

**Why:** The backend uses SQLAlchemy models (snake_case attributes) serialized via Pydantic. Depending on whether the data goes through `model_dump()` or `model_dump(by_alias=True)`, keys may be snake_case or camelCase. The generated TypeScript types reflect the spec's camelCase aliases, but backend may send snake_case.

**How to apply:** In all page components:
```js
// Field access
med.requires_prescription ?? med.requiresPrescription
med.generic_name ?? med.genericName
s.invoice_number ?? s.invoiceNumber
s.payment_method ?? s.paymentMethod
u.branch_id ?? u.branchId
```

Common aliases to watch:
- `invoice_number` / `invoiceNumber`
- `payment_method` / `paymentMethod`
- `requires_prescription` / `requiresPrescription`
- `generic_name` / `genericName`
- `sale_type` / `saleType`
- `patient_id` / `patientId`
