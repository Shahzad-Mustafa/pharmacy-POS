# 🏥 Pharmacy POS — Complete & Exhaustive API Specification
### FastAPI Backend | Dual-Mode (Retail + Hospital) | Production-Grade

> **How to read this document:**
> Every endpoint includes: Method · Path · Auth role(s) · Request body/params · Response shape · Side effects · Edge cases.
> Copy this into Replit as the single source of truth for every route the backend must implement.

---

## Base URL Convention

```
Development:  http://localhost:8000/api/v1
Production:   https://yourdomain.com/api/v1
WebSockets:   ws://localhost:8000/ws
```

### Global Headers (all protected endpoints)
```
Authorization: Bearer <access_token>
Content-Type:  application/json
X-Branch-ID:   <uuid>           # optional, overrides user's default branch
X-Request-ID:  <uuid>           # idempotency key for POST/PATCH
```

### Standard Error Response
```json
{
  "error": {
    "code": "MEDICINE_NOT_FOUND",
    "message": "Medicine with id X does not exist",
    "field": "medicine_id",
    "status": 404
  }
}
```

### Standard Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1, "per_page": 20,
    "total": 450, "pages": 23,
    "has_next": true, "has_prev": false
  }
}
```

---

## Role Abbreviations Used Below

| Code | Role |
|------|------|
| `ADM` | Admin |
| `PHR` | Pharmacist |
| `CSH` | Cashier |
| `MGR` | Store Manager |
| `DOC` | Doctor / Prescriber |
| `ACC` | Accountant |
| `*`   | Any authenticated user |

---

---

# MODULE 1 — AUTHENTICATION & SESSION MANAGEMENT

### 1.1 Login
```
POST /auth/login
Public (no token)
```
**Body:**
```json
{ "email": "jane@rx.pk", "password": "SecurePass1!", "branch_id": "uuid|null" }
```
**Response 200:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid", "name": "Jane Ali", "role": "pharmacist",
    "branch_id": "uuid", "branch_name": "Main Branch",
    "permissions": ["sales.create","inventory.read"]
  }
}
```
**Side effects:** Logs login event + IP to audit_logs. Records last_login on user.
**Errors:** 401 INVALID_CREDENTIALS, 403 ACCOUNT_DISABLED, 429 TOO_MANY_ATTEMPTS (5 fails/15 min → lockout).

---

### 1.2 Logout
```
POST /auth/logout
Auth: *
```
**Body:**
```json
{ "refresh_token": "eyJ..." }
```
Blacklists both access + refresh tokens in Redis (`SET token:blacklist:{jti} 1 EX <ttl>`).
**Response 200:** `{ "message": "Logged out successfully" }`

---

### 1.3 Refresh Access Token
```
POST /auth/refresh
Public (uses refresh token)
```
**Body:**
```json
{ "refresh_token": "eyJ..." }
```
**Response 200:**
```json
{ "access_token": "eyJ...", "expires_in": 900, "token_type": "bearer" }
```
**Errors:** 401 TOKEN_EXPIRED, 401 TOKEN_REVOKED, 401 TOKEN_INVALID.

---

### 1.4 Get Current User Profile
```
GET /auth/me
Auth: *
```
**Response 200:**
```json
{
  "id": "uuid", "name": "Jane Ali", "email": "jane@rx.pk",
  "role": "pharmacist", "branch": { "id": "uuid", "name": "Main Branch" },
  "permissions": [...], "last_login": "2025-06-15T09:00:00Z"
}
```

---

### 1.5 Change Password
```
PUT /auth/change-password
Auth: *
```
**Body:**
```json
{ "current_password": "...", "new_password": "...", "confirm_password": "..." }
```
**Side effects:** Revokes all active sessions. Audit log.
**Errors:** 400 PASSWORD_MISMATCH, 400 SAME_AS_CURRENT, 422 WEAK_PASSWORD.

---

### 1.6 Request Password Reset
```
POST /auth/forgot-password
Public
```
**Body:** `{ "email": "jane@rx.pk" }`
Sends reset link via email (SendGrid). Token TTL 1 hour, single-use.
**Response 200:** `{ "message": "Reset link sent if account exists" }` (no enumeration).

---

### 1.7 Reset Password (with token)
```
POST /auth/reset-password
Public
```
**Body:** `{ "token": "...", "new_password": "...", "confirm_password": "..." }`
**Side effects:** Invalidates reset token, revokes all active sessions.

---

### 1.8 List Active Sessions
```
GET /auth/sessions
Auth: *
```
**Response:**
```json
{ "sessions": [{ "jti": "...", "ip": "...", "user_agent": "...", "created_at": "..." }] }
```

---

### 1.9 Revoke Specific Session
```
DELETE /auth/sessions/{jti}
Auth: * (own sessions) | ADM (any user's sessions)
```

---

### 1.10 Verify Token (internal / health-check)
```
GET /auth/verify
Auth: *
```
**Response:** `{ "valid": true, "expires_at": "..." }`

---

---

# MODULE 2 — USER & STAFF MANAGEMENT

### 2.1 List Users
```
GET /users?role=&branch_id=&is_active=&page=&per_page=
Auth: ADM, MGR
```
**Response:** Paginated users list (excludes hashed_password).

---

### 2.2 Create User
```
POST /users
Auth: ADM
```
**Body:**
```json
{
  "name": "Ali Hassan", "email": "ali@rx.pk", "password": "TempPass1!",
  "role": "cashier", "branch_id": "uuid",
  "permissions": ["sales.create","patients.read"],
  "phone": "+92 300 0000000"
}
```
**Side effects:** Sends welcome email with temp password link. Audit log.
**Errors:** 409 EMAIL_ALREADY_EXISTS, 422 INVALID_ROLE.

---

### 2.3 Get User
```
GET /users/{user_id}
Auth: ADM, MGR | own profile: *
```

---

### 2.4 Update User
```
PUT /users/{user_id}
Auth: ADM
```
**Body:** Partial (any user field except password and id).
**Side effects:** If role changed → revoke active sessions.

---

### 2.5 Deactivate / Reactivate User
```
PATCH /users/{user_id}/status
Auth: ADM
```
**Body:** `{ "is_active": false, "reason": "Left organisation" }`
Deactivation blacklists all active sessions.

---

### 2.6 Reset User Password (admin action)
```
POST /users/{user_id}/reset-password
Auth: ADM
```
**Body:** `{ "new_password": "...", "force_change": true }`

---

### 2.7 Get User Activity Log
```
GET /users/{user_id}/activity?from=&to=&page=
Auth: ADM, MGR
```

---

### 2.8 Get User's Permissions
```
GET /users/{user_id}/permissions
Auth: ADM
```

---

### 2.9 Update User's Permissions
```
PUT /users/{user_id}/permissions
Auth: ADM
```
**Body:** `{ "permissions": ["sales.create","reports.read"] }`

---

### 2.10 List Available Roles & Permission Matrix
```
GET /users/roles/permissions-matrix
Auth: ADM
```

---

---

# MODULE 3 — BRANCHES / MULTI-LOCATION

### 3.1 List Branches
```
GET /branches?is_active=
Auth: ADM, MGR
```

### 3.2 Create Branch
```
POST /branches
Auth: ADM
```
**Body:**
```json
{
  "name": "Gulberg Branch", "code": "GLB",
  "address": "22-A Gulberg III, Lahore", "phone": "+92 42 111 000 000",
  "license_number": "PH-2025-GLB-001",
  "manager_id": "uuid", "settings": { "tax_rate": 0.17, "mrp_enforcement": true }
}
```

### 3.3 Get Branch
```
GET /branches/{branch_id}
Auth: *
```

### 3.4 Update Branch
```
PUT /branches/{branch_id}
Auth: ADM
```

### 3.5 Get Branch Settings
```
GET /branches/{branch_id}/settings
Auth: ADM, MGR
```

### 3.6 Update Branch Settings
```
PUT /branches/{branch_id}/settings
Auth: ADM
```
**Body:**
```json
{
  "tax_rate": 0.17, "mrp_enforcement": true,
  "low_stock_alert_threshold_days": 30,
  "expiry_alert_days": [90, 60, 30],
  "receipt_footer": "Thank you for choosing RxPOS!",
  "printer_config": { "type": "escpos", "ip": "192.168.1.100", "port": 9100 }
}
```

### 3.7 Get Branch Stock Summary
```
GET /branches/{branch_id}/stock-summary
Auth: MGR, PHR
```
Returns: total SKUs, total batches, total value, low-stock count, expiring-soon count.

### 3.8 Get Branch Dashboard KPIs
```
GET /branches/{branch_id}/dashboard?date=
Auth: MGR, ADM
```

---

---

# MODULE 4 — MEDICINE / DRUG MASTER

### 4.1 List Medicines
```
GET /medicines?page=&per_page=&category=&manufacturer=&requires_prescription=&is_active=&controlled_substance=&is_essential=&sort_by=name|mrp|created_at&sort_order=asc|desc
Auth: *
```

### 4.2 Create Medicine
```
POST /medicines
Auth: PHR, ADM, MGR
```
**Body:**
```json
{
  "name": "Augmentin 625mg Tab",
  "generic_name": "Amoxicillin + Clavulanic Acid",
  "brand": "GlaxoSmithKline",
  "composition": "Amoxicillin 500mg + Clavulanic Acid 125mg",
  "category": "Antibiotics",
  "atc_code": "J01CR02",
  "ndc_code": "0029-6075-12",
  "drap_registration_no": "039/001-HC/01",
  "rxcui": "723",
  "barcode": "5000158011671",
  "gtin": "05000158011671",
  "unit": "Tablet",
  "form": "Film-coated Tablet",
  "strength": "625mg",
  "pack_size": 14,
  "manufacturer": "GSK Pakistan",
  "requires_prescription": true,
  "controlled_substance_schedule": null,
  "is_essential_medicine": true,
  "min_stock_level": 20,
  "reorder_point": 50,
  "mrp": 350.00,
  "storage_conditions": "Store below 25°C",
  "contraindications": ["penicillin allergy"],
  "side_effects": ["nausea","diarrhea","skin rash"]
}
```
**Side effects:** Triggers async openFDA/RxNorm enrichment job.
**Errors:** 409 BARCODE_ALREADY_EXISTS, 409 DRAP_REG_DUPLICATE.

### 4.3 Get Medicine (detail)
```
GET /medicines/{medicine_id}
Auth: *
```
**Response includes:** current stock (all batches, all branches), pricing, enrichment metadata.

### 4.4 Update Medicine
```
PUT /medicines/{medicine_id}
Auth: PHR, ADM, MGR
```
**Partial updates accepted. Audit diff logged.**

### 4.5 Deactivate Medicine
```
DELETE /medicines/{medicine_id}
Auth: ADM
```
Soft-delete (sets `is_active=false`). Blocks if pending PO or active sales.

### 4.6 Search Medicines (primary search endpoint)
```
GET /medicines/search?q=&barcode=&generic=&ndc=&rxcui=&drap_no=&branch_id=&in_stock_only=true
Auth: *
```
- `q` → trigram full-text on name + generic_name + brand.
- `barcode` → exact match (GS1 DataMatrix parse included).
- Returns current stock per branch in result.

### 4.7 Lookup by Barcode / GS1 DataMatrix
```
POST /medicines/barcode-lookup
Auth: *
```
**Body:**
```json
{
  "raw_scan": "010350380816017917240630100BATCH01",
  "branch_id": "uuid"
}
```
**Response:** Medicine + batch details + available qty.
Parses GS1 AIs: (01) GTIN, (17) expiry, (10) lot, (21) serial.

### 4.8 Get Drug Interactions
```
GET /medicines/{medicine_id}/interactions?compare_with[]=uuid1&compare_with[]=uuid2
Auth: PHR, DOC, ADM
```
Calls DrugBank (if licensed) or openFDA label parser. Returns severity-graded interaction list.

### 4.9 Check Allergy Cross-Match
```
POST /medicines/allergy-check
Auth: PHR, DOC
```
**Body:** `{ "medicine_ids": ["uuid1","uuid2"], "patient_id": "uuid" }`
Checks medicine compositions against patient's `allergies[]`.
**Response:** `{ "safe": false, "conflicts": [{ "medicine": "...", "allergen": "penicillin" }] }`

### 4.10 Get Low-Stock Medicines
```
GET /medicines/low-stock?branch_id=&threshold=
Auth: PHR, MGR, ADM
```

### 4.11 Get Expiring-Soon Medicines
```
GET /medicines/expiring-soon?days=90&branch_id=
Auth: PHR, MGR, ADM
```
Returns batches with qty > 0 expiring within N days, grouped by urgency (30/60/90).

### 4.12 Get Out-of-Stock Medicines
```
GET /medicines/out-of-stock?branch_id=
Auth: PHR, MGR, ADM
```

### 4.13 Get Medicine Price History
```
GET /medicines/{medicine_id}/price-history?from=&to=
Auth: MGR, ADM, ACC
```

### 4.14 Update Medicine MRP
```
PATCH /medicines/{medicine_id}/mrp
Auth: ADM, MGR
```
**Body:** `{ "new_mrp": 375.00, "effective_date": "2025-07-01", "reason": "DRAP MRP revision" }`
Propagates to batch selling_price cap.

### 4.15 Enrich Medicine from External APIs
```
POST /medicines/{medicine_id}/enrich
Auth: ADM, PHR
```
**Body:** `{ "sources": ["openfda","rxnorm","dailymed","drugbank"] }`
**Response:**
```json
{
  "enriched": {
    "rxcui": "723",
    "atc_code": "J01CR02",
    "ndc_codes": ["0029-6075-12"],
    "label_url": "https://dailymed.nlm.nih.gov/...",
    "dea_schedule": null,
    "boxed_warning": false,
    "adverse_events_count": 14250
  },
  "source_responses": { "openfda": "ok", "rxnorm": "ok", "dailymed": "ok" }
}
```

### 4.16 Get Medicine External Data (raw)
```
GET /medicines/{medicine_id}/external?source=openfda|rxnorm|dailymed|drugbank
Auth: ADM, PHR
```

### 4.17 Import Medicines (bulk CSV/Excel)
```
POST /medicines/import
Auth: ADM
Body: multipart/form-data  file=<csv|xlsx>
```
**Response:** `{ "imported": 120, "skipped": 3, "errors": [{ "row": 5, "reason": "Duplicate barcode" }] }`

### 4.18 Export Medicines
```
GET /medicines/export?format=csv|xlsx|pdf&category=&branch_id=
Auth: MGR, ADM
```

### 4.19 Get Medicine Categories
```
GET /medicines/categories
Auth: *
```

### 4.20 Get Therapeutic Alternatives
```
GET /medicines/{medicine_id}/alternatives?generic_only=true
Auth: PHR, DOC
```
Returns same generic_name, same ATC code, different brand — sorted by price.

### 4.21 Get Controlled Substances List
```
GET /medicines/controlled-substances?schedule=&branch_id=
Auth: PHR, MGR, ADM
```

### 4.22 Get Medicine Audit Trail
```
GET /medicines/{medicine_id}/audit
Auth: ADM, MGR
```

---

---

# MODULE 5 — INVENTORY MANAGEMENT

### 5.1 Get Inventory Overview
```
GET /inventory?branch_id=&category=&sort_by=quantity|value|expiry
Auth: PHR, MGR, ADM
```
Returns: all medicines + their batches + total qty + total value per branch.

### 5.2 List Batches
```
GET /inventory/batches?medicine_id=&branch_id=&supplier_id=&expiry_before=&expiry_after=&has_stock=true&page=
Auth: PHR, MGR, ADM
```

### 5.3 Get Batch
```
GET /inventory/batches/{batch_id}
Auth: PHR, MGR, ADM
```

### 5.4 Create Batch Manually
```
POST /inventory/batches
Auth: PHR, MGR, ADM
```
**Body:**
```json
{
  "medicine_id": "uuid", "branch_id": "uuid",
  "batch_number": "BATCH2025A", "serial_number": null,
  "expiry_date": "2027-06-30", "manufacturing_date": "2025-01-15",
  "quantity": 200,
  "purchase_price": 280.00, "selling_price": 350.00,
  "supplier_id": "uuid", "grn_id": null
}
```
**Errors:** 409 BATCH_NUMBER_EXISTS (per medicine+supplier), 422 EXPIRY_IN_PAST.

### 5.5 Update Batch
```
PUT /inventory/batches/{batch_id}
Auth: MGR, ADM
```
Allows updating selling_price, notes. Qty can only change via adjustments or GRN.

### 5.6 Get Batch Transaction History
```
GET /inventory/batches/{batch_id}/transactions
Auth: PHR, MGR, ADM
```
Returns: all sales, adjustments, transfers touching this batch.

### 5.7 Create Stock Adjustment
```
POST /inventory/adjustments
Auth: PHR, MGR (limited) | ADM (all types)
```
**Body:**
```json
{
  "batch_id": "uuid", "branch_id": "uuid",
  "adjustment_type": "damage|theft|expiry|correction|opening_stock",
  "quantity_change": -5,
  "reason": "Damaged packaging found during stock count",
  "reference": "DAMAGE-2025-001",
  "witnessed_by": "uuid"
}
```
**Side effects:** Updates batch qty; if controlled substance → logs to controlled_substance_log; audit log; WebSocket notification to MGR if qty drops below reorder.
**Errors:** 400 WOULD_MAKE_NEGATIVE, 403 INSUFFICIENT_PERMISSION_FOR_TYPE.

### 5.8 List Stock Adjustments
```
GET /inventory/adjustments?branch_id=&batch_id=&type=&from=&to=&page=
Auth: MGR, ADM
```

### 5.9 Stock Transfer Between Branches
```
POST /inventory/transfers
Auth: MGR, ADM
```
**Body:**
```json
{
  "from_branch_id": "uuid", "to_branch_id": "uuid",
  "items": [
    { "batch_id": "uuid", "quantity": 50 }
  ],
  "notes": "Gulberg branch is low on Augmentin",
  "transfer_date": "2025-06-15"
}
```
**Side effects:** Atomically decrements source batch, creates new batch at destination (same batch_number, expiry, mfg date), logs adjustment records on both sides.
**Errors:** 400 INSUFFICIENT_STOCK_AT_SOURCE, 422 SAME_BRANCH.

### 5.10 List Transfers
```
GET /inventory/transfers?from_branch=&to_branch=&status=&from=&to=&page=
Auth: MGR, ADM
```

### 5.11 Get Transfer
```
GET /inventory/transfers/{transfer_id}
Auth: MGR, ADM
```

### 5.12 Get Stock Valuation
```
GET /inventory/valuation?branch_id=&method=fifo|fefo|average&as_of_date=
Auth: MGR, ADM, ACC
```
**Response:**
```json
{
  "total_cost_value": 1250000.00,
  "total_mrp_value": 1800000.00,
  "potential_profit": 550000.00,
  "breakdown": [{ "medicine": "...", "qty": 200, "cost": 56000, "mrp_value": 70000 }]
}
```

### 5.13 Stock Count / Physical Inventory
```
POST /inventory/stock-count
Auth: MGR, ADM
```
**Body:**
```json
{
  "branch_id": "uuid",
  "count_date": "2025-06-15",
  "items": [
    { "batch_id": "uuid", "physical_qty": 183 }
  ],
  "notes": "Monthly count June 2025"
}
```
**Response:** Variance report (expected vs physical). Does NOT auto-adjust; requires confirm step.

### 5.14 Confirm Stock Count & Apply Variances
```
POST /inventory/stock-count/{count_id}/confirm
Auth: ADM, MGR
```
Creates adjustment records for every variance. Audit log.

### 5.15 Get Stock Count History
```
GET /inventory/stock-count?branch_id=&from=&to=
Auth: MGR, ADM
```

### 5.16 Controlled Substance Log
```
GET /inventory/controlled-substances/log?medicine_id=&branch_id=&from=&to=&transaction_type=
Auth: PHR, MGR, ADM
```

### 5.17 Controlled Substance Reconciliation
```
POST /inventory/controlled-substances/reconcile
Auth: ADM
```
**Body:**
```json
{ "medicine_id": "uuid", "branch_id": "uuid", "period": "2025-06", "physical_count": 45, "witness_id": "uuid" }
```

### 5.18 Get Reorder Suggestions
```
GET /inventory/reorder-suggestions?branch_id=&days_cover=30
Auth: MGR, ADM
```
Calculates avg daily consumption × days_cover → suggested PO qty.

### 5.19 FEFO Allocation Preview
```
POST /inventory/fefo-preview
Auth: PHR
```
**Body:** `{ "medicine_id": "uuid", "branch_id": "uuid", "quantity": 10 }`
Shows which batches will be used (FEFO order) before creating sale.

---

---

# MODULE 6 — PATIENTS / CUSTOMERS

### 6.1 List Patients
```
GET /patients?customer_type=retail|hospital&branch_id=&page=&per_page=
Auth: PHR, CSH, MGR, ADM
```

### 6.2 Create Patient
```
POST /patients
Auth: PHR, CSH, MGR, ADM
```
**Body:**
```json
{
  "name": "Fatima Malik", "dob": "1990-03-22", "gender": "female",
  "phone": "+92 300 1234567", "email": "fatima@email.com",
  "address": "House 12, Block C, DHA Lahore", "cnic": "35202-1234567-2",
  "allergies": ["penicillin","sulfonamides"],
  "chronic_conditions": ["Type 2 Diabetes","Hypertension"],
  "chronic_medications": ["Metformin 500mg","Losartan 50mg"],
  "insurance_provider_id": "uuid", "insurance_member_id": "EFU-2025-123456",
  "customer_type": "retail",
  "mrn": null, "ward": null,
  "blood_group": "B+",
  "emergency_contact": { "name": "Ahmed Malik", "phone": "+92 300 9999999", "relation": "Husband" }
}
```
**Errors:** 409 CNIC_ALREADY_EXISTS, 422 INVALID_CNIC_FORMAT.

### 6.3 Get Patient (full profile)
```
GET /patients/{patient_id}
Auth: PHR, CSH, MGR, ADM
```
**Response includes:** demographics, allergies, chronic meds, insurance, stats (total visits, total spend, last visit).

### 6.4 Update Patient
```
PUT /patients/{patient_id}
Auth: PHR, MGR, ADM
```

### 6.5 Search Patients
```
GET /patients/search?q=&cnic=&phone=&mrn=&insurance_member_id=
Auth: PHR, CSH, MGR, ADM
```
`q` → name trgm. Returns fast lightweight list.

### 6.6 Get Patient Purchase History
```
GET /patients/{patient_id}/history?from=&to=&branch_id=&page=
Auth: PHR, MGR, ADM
```

### 6.7 Get Patient Prescriptions
```
GET /patients/{patient_id}/prescriptions?status=&from=&to=&page=
Auth: PHR, DOC, MGR, ADM
```

### 6.8 Get Patient Chronic Medications
```
GET /patients/{patient_id}/chronic-medications
Auth: PHR, DOC
```

### 6.9 Update Patient Chronic Medications
```
PUT /patients/{patient_id}/chronic-medications
Auth: PHR, DOC
```
**Body:** `{ "medications": ["Metformin 500mg BD","Losartan 50mg OD"], "updated_by_doctor": "uuid" }`

### 6.10 Get Patient Allergies
```
GET /patients/{patient_id}/allergies
Auth: PHR, DOC
```

### 6.11 Update Patient Allergies
```
PUT /patients/{patient_id}/allergies
Auth: PHR, DOC
```
**Body:** `{ "allergies": ["penicillin","aspirin"] }`
**Side effects:** Triggers interaction check on current chronic medications.

### 6.12 Get Patient Insurance Details
```
GET /patients/{patient_id}/insurance
Auth: PHR, CSH, MGR, ADM
```

### 6.13 Update Patient Insurance
```
PUT /patients/{patient_id}/insurance
Auth: PHR, MGR, ADM
```

### 6.14 Get Patient Statements (account summary)
```
GET /patients/{patient_id}/statement?from=&to=
Auth: MGR, ADM, ACC
```
For credit/account patients: total billed, paid, outstanding.

### 6.15 Merge Duplicate Patients
```
POST /patients/merge
Auth: ADM
```
**Body:** `{ "keep_id": "uuid", "merge_id": "uuid" }` — merges history, prescriptions, sales to keep_id, soft-deletes merge_id.

### 6.16 Get Patient Loyalty Points
```
GET /patients/{patient_id}/loyalty
Auth: CSH, PHR
```

### 6.17 Export Patient Data (GDPR/privacy)
```
GET /patients/{patient_id}/export
Auth: ADM
```

### 6.18 Delete Patient (soft)
```
DELETE /patients/{patient_id}
Auth: ADM
```
Blocks if outstanding balance or active prescriptions.

---

---

# MODULE 7 — PRESCRIPTIONS

### 7.1 List Prescriptions
```
GET /prescriptions?patient_id=&doctor_id=&status=received|verified|filled|dispensed|collected|cancelled&source=manual|ocr|fhir|qr&from=&to=&branch_id=&page=
Auth: PHR, DOC, MGR, ADM
```

### 7.2 Create Prescription (manual)
```
POST /prescriptions
Auth: PHR, DOC, CSH
```
**Body:**
```json
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "prescriber_name": "Dr. Usman Chaudhry",
  "prescriber_license": "PMDC-12345",
  "prescription_date": "2025-06-15",
  "prescription_number": "RX-2025-006150001",
  "hospital_ward": null,
  "source": "manual",
  "items": [
    {
      "medicine_id": "uuid",
      "drug_text": "Augmentin 625mg",
      "dosage": "1 tablet",
      "frequency": "every 8 hours",
      "duration": "7 days",
      "quantity": 21,
      "instructions": "After meals"
    }
  ],
  "notes": "Patient allergic to penicillin — verify before dispensing"
}
```
**Side effects:** Checks patient allergies vs prescribed medicines. If conflict → warning (not block, pharmacist must confirm). Sets status = `received`.

### 7.3 Get Prescription
```
GET /prescriptions/{prescription_id}
Auth: PHR, DOC, MGR, ADM
```

### 7.4 Update Prescription
```
PUT /prescriptions/{prescription_id}
Auth: PHR, DOC
```
Only allowed in `received` or `verified` status.

### 7.5 Cancel Prescription
```
POST /prescriptions/{prescription_id}/cancel
Auth: PHR, ADM
```
**Body:** `{ "reason": "Patient got prescription from another doctor" }`

### 7.6 Verify Prescription
```
POST /prescriptions/{prescription_id}/verify
Auth: PHR
```
**Body:**
```json
{
  "verified_by": "uuid",
  "notes": "Allergy confirmed, dose appropriate",
  "interaction_check_passed": true,
  "override_reason": null
}
```
Status → `verified`.

### 7.7 Mark Prescription as Filled
```
POST /prescriptions/{prescription_id}/fill
Auth: PHR
```
Status → `filled`. Called after POS sale is created linking this prescription.

### 7.8 Mark Prescription as Dispensed
```
POST /prescriptions/{prescription_id}/dispense
Auth: PHR
```
**Body:** `{ "dispensed_to": "patient|caregiver", "collection_notes": null }`
Status → `dispensed`.

### 7.9 Mark Prescription as Collected
```
POST /prescriptions/{prescription_id}/collect
Auth: CSH, PHR
```
Status → `collected`.

### 7.10 Import Prescription via OCR
```
POST /prescriptions/import-ocr
Auth: PHR
Body: multipart/form-data
  file=<image/pdf>  (jpg/png/pdf, max 10MB)
  patient_id=uuid   (optional, attach to patient)
  ocr_provider=google_vision|aws_textract|tesseract
```
**Flow:** Upload → OCR → NLP parsing → draft prescription items → return draft for pharmacist review.
**Response:**
```json
{
  "draft_prescription": {
    "prescription_number": null,
    "prescriber_name": "Dr. Ahmed",
    "prescription_date": "2025-06-14",
    "items": [
      {
        "drug_text": "Augmentin 625mg",
        "medicine_id": "uuid",
        "medicine_name": "Augmentin 625mg Tab",
        "match_confidence": 0.91,
        "dosage": "1 tab", "frequency": "TDS", "duration": "7 days", "quantity": 21
      }
    ],
    "ocr_confidence": 0.87,
    "unmatched_drugs": ["Zithrax 500mg"]
  },
  "ocr_provider": "google_vision",
  "image_url": "/uploads/rx/2025/06/15/abc123.jpg"
}
```
Draft auto-saved. Pharmacist edits + confirms → creates actual prescription.
**Errors:** 422 UNSUPPORTED_FILE_TYPE, 422 IMAGE_TOO_LOW_QUALITY, 503 OCR_SERVICE_UNAVAILABLE.

### 7.11 Confirm OCR Draft
```
POST /prescriptions/import-ocr/{draft_id}/confirm
Auth: PHR
```
**Body:** `{ "edited_items": [...], "patient_id": "uuid", "notes": "..." }`

### 7.12 Import Prescription via FHIR R4
```
POST /prescriptions/import-fhir
Auth: PHR, ADM
Body: application/json  — FHIR R4 Bundle (MedicationRequest + Patient + Practitioner)
```
**Response:** Parsed prescription draft + patient match/create result.
**Errors:** 422 INVALID_FHIR_BUNDLE, 422 MISSING_MEDICATION_REQUEST.

### 7.13 Import Prescription via QR Code
```
POST /prescriptions/import-qr
Auth: PHR, CSH
```
**Body:** `{ "qr_content": "..." }` — raw decoded QR string.

### 7.14 Get Prescription Refill Status
```
GET /prescriptions/{prescription_id}/refills
Auth: PHR, DOC
```
Number of times filled, last fill date, remaining refills.

### 7.15 Request Prescription Refill
```
POST /prescriptions/{prescription_id}/refill
Auth: PHR, CSH
```

### 7.16 Print Prescription Label
```
POST /prescriptions/{prescription_id}/print-label
Auth: PHR
```
Prints ESC/POS medicine-packet labels for each item.

### 7.17 Get Prescription PDF
```
GET /prescriptions/{prescription_id}/pdf
Auth: PHR, ADM
```
Returns PDF summary of prescription + dispensing details.

### 7.18 Prescription Statistics
```
GET /prescriptions/stats?branch_id=&from=&to=
Auth: MGR, ADM
```
Returns: received vs dispensed rate, top prescribed medicines, top prescribers.

---

---

# MODULE 8 — POINT OF SALE (SALES / BILLING)

### 8.1 Create Sale
```
POST /sales
Auth: CSH, PHR, MGR
```
**Body:**
```json
{
  "branch_id": "uuid",
  "patient_id": "uuid|null",
  "prescription_id": "uuid|null",
  "sale_type": "retail|hospital",
  "ward": null,
  "encounter_id": null,
  "cashier_id": "uuid",
  "items": [
    {
      "medicine_id": "uuid",
      "batch_id": "uuid|null",
      "quantity": 2,
      "unit_price": 350.00,
      "discount_pct": 0,
      "discount_flat": 0
    }
  ],
  "discount_on_invoice": 0.00,
  "discount_pct_on_invoice": 0,
  "tax_rate": 0.17,
  "payment_method": "cash",
  "amount_tendered": 800.00,
  "insurance_claim_id": "uuid|null",
  "notes": null
}
```
**Server-side logic:**
1. Validate each `medicine_id` is active.
2. If `batch_id` null → run FEFO auto-allocation.
3. Check qty ≤ available stock (per branch).
4. Check `unit_price` ≤ MRP (if MRP enforcement ON).
5. Check `requires_prescription` → reject if no `prescription_id`.
6. Check patient allergies + drug interactions → warning payload.
7. Calculate: `line_total = qty × unit_price − discount`; `subtotal = Σ line_total`; `tax = subtotal × tax_rate`; `total = subtotal + tax − invoice_discount`.
8. Atomic transaction: decrement batch qty, create sale + items, create controlled_substance_log entries.
9. If `payment_method = cash` → calculate `change = amount_tendered − total`.
10. Trigger WebSocket `stock_updated` to `ws/pos/{branch_id}`.
11. Trigger Celery low-stock check.

**Response:**
```json
{
  "sale": { "id": "uuid", "invoice_number": "INV-2025-06150001", "total": 700.00, "change": 100.00, ... },
  "items": [...],
  "warnings": [{ "type": "interaction", "severity": "moderate", "medicines": ["Drug A","Drug B"] }],
  "stock_updated": [{ "medicine_id": "uuid", "new_qty": 18 }]
}
```
**Errors:** 400 INSUFFICIENT_STOCK, 400 PRESCRIPTION_REQUIRED, 400 PRICE_EXCEEDS_MRP, 400 PATIENT_ALLERGY_CONFLICT (soft — returns warning, caller must send `force: true`).

### 8.2 Get Sale
```
GET /sales/{sale_id}
Auth: CSH, PHR, MGR, ADM, ACC
```

### 8.3 List Sales
```
GET /sales?from=&to=&branch_id=&cashier_id=&patient_id=&sale_type=retail|hospital&payment_method=&status=&page=&per_page=
Auth: MGR, ADM, ACC
```

### 8.4 Search Sales
```
GET /sales/search?invoice_number=&patient_name=&patient_cnic=
Auth: CSH, PHR, MGR, ADM
```

### 8.5 Hold Sale
```
POST /sales/{sale_id}/hold
Auth: CSH, PHR
```
Status → `held`. Does NOT decrement stock. Sale items saved for resumption.

### 8.6 Resume Held Sale
```
POST /sales/{sale_id}/resume
Auth: CSH, PHR
```
Re-checks stock availability, then status → active (in-progress). Returns full cart state.

### 8.7 List Held Sales
```
GET /sales/held?branch_id=&cashier_id=
Auth: CSH, PHR, MGR
```

### 8.8 Void Sale (before payment)
```
POST /sales/{sale_id}/void
Auth: CSH, PHR
```
Only for in-progress / held sales. No stock movement.

### 8.9 Process Refund / Return
```
POST /sales/{sale_id}/refund
Auth: PHR, MGR
```
**Body:**
```json
{
  "items": [
    { "sale_item_id": "uuid", "quantity": 1, "reason": "Wrong medicine dispensed" }
  ],
  "refund_method": "cash|store_credit",
  "restock": true,
  "notes": "Patient returned unused tablets"
}
```
**Validation:**
- Reject if batch expiry < today (can't restock expired).
- Reject if quantity > originally sold.
- If restock → reverse batch qty decrement.
- Creates a `refund_sale` record linked to original.
- Audit log.

### 8.10 Get Refund
```
GET /sales/{sale_id}/refunds
Auth: PHR, MGR, ADM
```

### 8.11 Apply Payment to Credit Sale
```
POST /sales/{sale_id}/payments
Auth: CSH, MGR
```
**Body:** `{ "amount": 500.00, "payment_method": "cash", "notes": null }`
For partial-payment / credit sales.

### 8.12 Get Payments for a Sale
```
GET /sales/{sale_id}/payments
Auth: CSH, MGR, ADM
```

### 8.13 Print Receipt (ESC/POS)
```
POST /sales/{sale_id}/print
Auth: CSH, PHR
```
**Body:** `{ "printer_id": "uuid|null", "copies": 1 }`
Sends to ESC/POS printer configured for branch.

### 8.14 Get Sale PDF
```
GET /sales/{sale_id}/pdf
Auth: *
```

### 8.15 Get Sale as FHIR MedicationDispense
```
GET /sales/{sale_id}/fhir
Auth: PHR, ADM
```
Returns FHIR R4 MedicationDispense Bundle for interoperability.

### 8.16 Scan Product (POS helper)
```
POST /sales/scan
Auth: CSH, PHR
```
**Body:**
```json
{ "scan_data": "010350380816017917240630100BATCH01", "branch_id": "uuid", "quantity": 1 }
```
**Response:**
```json
{
  "medicine": { "id": "uuid", "name": "...", "mrp": 350.00, "requires_prescription": false },
  "batch": { "id": "uuid", "batch_number": "BATCH01", "expiry_date": "2024-06-30", "available_qty": 50 },
  "warning": "BATCH_EXPIRING_SOON",
  "fefo_batch": { "id": "uuid", "expiry_date": "2024-03-15" }
}
```
**Errors:** 404 BARCODE_NOT_FOUND, 400 EXPIRED_BATCH, 400 OUT_OF_STOCK.

### 8.17 Calculate Sale Total (preview — no commit)
```
POST /sales/calculate
Auth: CSH, PHR
```
Same body as POST /sales but dry-run. Returns totals, tax, discount, change, warnings.

### 8.18 Daily Cash Reconciliation (Z-Report)
```
POST /sales/z-report
Auth: MGR, ADM
```
**Body:** `{ "branch_id": "uuid", "cashier_id": "uuid|null", "date": "2025-06-15" }`
Closes the day. Returns: opening float, total cash sales, refunds, net cash, variance, transaction count.

### 8.19 Get Daily Summary
```
GET /sales/daily-summary?branch_id=&date=&cashier_id=
Auth: CSH (own), MGR, ADM
```

### 8.20 Ward Dispensing (hospital mode)
```
POST /sales/ward-dispense
Auth: PHR, MGR
```
**Body:**
```json
{
  "ward": "Ward 3 — Surgical", "patient_id": "uuid",
  "encounter_id": "uuid", "attending_doctor_id": "uuid",
  "items": [...],
  "charge_to": "patient|ward_budget|insurance"
}
```

### 8.21 Get Hospital Ward Dispensing Log
```
GET /sales/ward-dispense?ward=&from=&to=&patient_id=
Auth: PHR, MGR, ADM
```

### 8.22 Get Sales KPIs
```
GET /sales/kpis?branch_id=&date=
Auth: MGR, ADM
```
Returns: today's revenue, transactions, avg basket, top-selling medicine, top cashier.

---

---

# MODULE 9 — SUPPLIERS / VENDORS

### 9.1 List Suppliers
```
GET /suppliers?is_active=&page=
Auth: MGR, ADM, PHR
```

### 9.2 Create Supplier
```
POST /suppliers
Auth: ADM, MGR
```
**Body:**
```json
{
  "name": "MedLife Distributors", "contact_person": "Tariq Hussain",
  "phone": "+92 21 3456 7890", "email": "tariq@medlife.pk",
  "address": "Industrial Area, Karachi",
  "license_number": "DIS-2025-KHI-001", "ntn": "1234567-8",
  "credit_days": 30,
  "payment_terms": "Net 30",
  "bank_details": { "bank": "HBL", "account": "01234567890103", "title": "MedLife Dist" },
  "notes": null
}
```

### 9.3 Get Supplier
```
GET /suppliers/{supplier_id}
Auth: MGR, ADM
```

### 9.4 Update Supplier
```
PUT /suppliers/{supplier_id}
Auth: ADM, MGR
```

### 9.5 Deactivate Supplier
```
DELETE /suppliers/{supplier_id}
Auth: ADM
```
Blocks if open POs exist.

### 9.6 Get Supplier Purchase History
```
GET /suppliers/{supplier_id}/history?from=&to=&page=
Auth: MGR, ADM, ACC
```

### 9.7 Get Supplier Ledger (payables)
```
GET /suppliers/{supplier_id}/ledger?from=&to=
Auth: ACC, ADM
```
GRNs (debits) vs payments (credits) → outstanding balance.

### 9.8 Record Supplier Payment
```
POST /suppliers/{supplier_id}/payments
Auth: ACC, ADM
```
**Body:**
```json
{
  "amount": 50000.00, "payment_date": "2025-06-15",
  "method": "bank_transfer|cheque|cash",
  "reference": "HBL-TT-2025-0001",
  "grn_ids": ["uuid1","uuid2"],
  "notes": null
}
```

### 9.9 Get Payables Aging Report
```
GET /suppliers/payables-aging?branch_id=&as_of_date=
Auth: ACC, ADM, MGR
```
Groups by supplier: current, 0–30, 31–60, 61–90, 90+ days overdue.

### 9.10 Create Purchase Order
```
POST /suppliers/purchase-orders
Auth: MGR, PHR, ADM
```
**Body:**
```json
{
  "po_number": "PO-2025-06150001",
  "supplier_id": "uuid", "branch_id": "uuid",
  "order_date": "2025-06-15", "expected_date": "2025-06-20",
  "items": [
    { "medicine_id": "uuid", "quantity": 100, "unit_price": 280.00 }
  ],
  "discount": 0, "tax": 0,
  "notes": "Urgent — Augmentin running low",
  "send_to_supplier": false
}
```

### 9.11 List Purchase Orders
```
GET /suppliers/purchase-orders?supplier_id=&branch_id=&status=draft|sent|partial|received|cancelled&from=&to=&page=
Auth: MGR, PHR, ADM
```

### 9.12 Get Purchase Order
```
GET /suppliers/purchase-orders/{po_id}
Auth: MGR, PHR, ADM
```

### 9.13 Update Purchase Order
```
PUT /suppliers/purchase-orders/{po_id}
Auth: MGR, ADM
```
Only allowed in `draft` or `sent` status.

### 9.14 Send Purchase Order to Supplier
```
POST /suppliers/purchase-orders/{po_id}/send
Auth: MGR, ADM
```
Status → `sent`. Sends email PDF to supplier. Records sent_at timestamp.

### 9.15 Cancel Purchase Order
```
POST /suppliers/purchase-orders/{po_id}/cancel
Auth: MGR, ADM
```
**Body:** `{ "reason": "..." }` — Blocks if any GRN already created.

### 9.16 Get Purchase Order PDF
```
GET /suppliers/purchase-orders/{po_id}/pdf
Auth: MGR, ADM
```

### 9.17 Create GRN (Goods Received Note)
```
POST /suppliers/grn
Auth: PHR, MGR, ADM
```
**Body:**
```json
{
  "grn_number": "GRN-2025-06150001",
  "po_id": "uuid|null",
  "supplier_id": "uuid",
  "branch_id": "uuid",
  "received_date": "2025-06-15",
  "supplier_invoice_number": "INV-MED-2025-456",
  "received_by": "uuid",
  "items": [
    {
      "medicine_id": "uuid",
      "batch_number": "BATCH2025A",
      "expiry_date": "2027-06-30",
      "manufacturing_date": "2025-01-15",
      "quantity_ordered": 100,
      "quantity_received": 95,
      "purchase_price": 280.00,
      "selling_price": 350.00,
      "free_qty": 5
    }
  ],
  "notes": "5 units short — supplier to credit"
}
```
**Side effects:**
1. Creates `medicine_batches` for each item.
2. Updates PO received qty + status.
3. Creates COGS entry for accounting sync.
4. Fires `stock_updated` WebSocket.
5. If quantity < ordered → leaves PO in `partial` status.

### 9.18 List GRNs
```
GET /suppliers/grn?supplier_id=&branch_id=&from=&to=&po_id=&page=
Auth: MGR, PHR, ADM
```

### 9.19 Get GRN
```
GET /suppliers/grn/{grn_id}
Auth: MGR, PHR, ADM
```

### 9.20 Get GRN PDF
```
GET /suppliers/grn/{grn_id}/pdf
Auth: MGR, ADM
```

### 9.21 Create Supplier Return (Debit Note)
```
POST /suppliers/returns
Auth: MGR, ADM
```
**Body:**
```json
{
  "return_number": "SR-2025-001",
  "supplier_id": "uuid", "branch_id": "uuid",
  "return_date": "2025-06-15",
  "items": [
    { "batch_id": "uuid", "quantity": 10, "reason": "near_expiry|damaged|wrong_item|overstock" }
  ],
  "credit_note_expected": true, "notes": null
}
```
**Side effects:** Decrements batch qty, creates stock_adjustment, logs supplier return.

### 9.22 List Supplier Returns
```
GET /suppliers/returns?supplier_id=&branch_id=&from=&to=&page=
Auth: MGR, ADM
```

### 9.23 Import Supplier Price List
```
POST /suppliers/{supplier_id}/price-list
Auth: ADM, MGR
Body: multipart/form-data  file=<csv|xlsx>
```
Imports and previews price changes — requires confirm step before applying.

---

---

# MODULE 10 — INSURANCE & TPA CLAIMS

### 10.1 List Insurance Providers
```
GET /insurance/providers?type=private|government|tpa|takaful&is_active=
Auth: MGR, ADM
```

### 10.2 Create Insurance Provider
```
POST /insurance/providers
Auth: ADM
```
**Body:**
```json
{
  "name": "EFU Health Insurance",
  "type": "private",
  "adapter": "manual_panel",
  "claim_api_endpoint": null,
  "api_credentials": null,
  "coverage_rules": {
    "max_annual_limit": 500000,
    "covers_opd": true,
    "covers_pharmacy": true,
    "copay_pct": 20,
    "excluded_drug_categories": ["cosmetics","vitamins_otc"]
  },
  "is_cashless": true,
  "is_active": true,
  "contact": { "name": "EFU TPA Desk", "phone": "021-111-338-338", "email": "claims@efu.pk" }
}
```

### 10.3 Get Insurance Provider
```
GET /insurance/providers/{provider_id}
Auth: MGR, ADM
```

### 10.4 Update Insurance Provider
```
PUT /insurance/providers/{provider_id}
Auth: ADM
```

### 10.5 Check Patient Eligibility
```
POST /insurance/eligibility
Auth: PHR, CSH
```
**Body:**
```json
{
  "patient_id": "uuid",
  "provider_id": "uuid",
  "service_date": "2025-06-15",
  "service_type": "pharmacy"
}
```
**Response:**
```json
{
  "eligible": true,
  "member_name": "Fatima Malik",
  "policy_number": "EFU-POL-2025-123",
  "coverage_start": "2025-01-01", "coverage_end": "2025-12-31",
  "annual_limit": 500000, "used": 87500, "remaining": 412500,
  "copay_pct": 20,
  "excluded_categories": ["vitamins_otc"],
  "pre_auth_required_above": 10000,
  "raw_response": {}
}
```
For X12 adapter → sends 270, returns 271 parse. For manual_panel → looks up local policy record.

### 10.6 Create Insurance Claim
```
POST /insurance/claims
Auth: PHR, CSH, MGR
```
**Body:**
```json
{
  "sale_id": "uuid",
  "patient_id": "uuid",
  "provider_id": "uuid",
  "claim_amount": 1200.00,
  "patient_copay": 240.00,
  "items": [
    { "medicine_id": "uuid", "quantity": 2, "unit_price": 350.00, "claimed_amount": 700.00 }
  ],
  "diagnosis_codes": ["E11.9","I10"],
  "prescription_id": "uuid",
  "documents": []
}
```
Status → `draft`.

### 10.7 Get Claim
```
GET /insurance/claims/{claim_id}
Auth: PHR, MGR, ADM, ACC
```

### 10.8 List Claims
```
GET /insurance/claims?provider_id=&patient_id=&status=draft|preauth|submitted|adjudicated|paid|rejected&from=&to=&branch_id=&page=
Auth: MGR, ADM, ACC
```

### 10.9 Submit Pre-Authorization Request
```
POST /insurance/claims/{claim_id}/preauth
Auth: PHR, MGR
```
**Body:**
```json
{
  "requested_amount": 1200.00,
  "clinical_justification": "Patient requires chronic medication — Type 2 DM",
  "documents": ["prescription_scan","lab_reports"],
  "urgency": "routine|urgent|emergency"
}
```
Status → `preauth`. Dispatches to adapter (X12 278 or manual document upload).

### 10.10 Upload Claim Document
```
POST /insurance/claims/{claim_id}/documents
Auth: PHR, CSH, MGR
Body: multipart/form-data
  file=<pdf|jpg|png>  document_type=prescription|cnic|invoice|lab_report|discharge_summary|other
```
Stores file, appends to claim.documents[].

### 10.11 Submit Claim
```
POST /insurance/claims/{claim_id}/submit
Auth: PHR, MGR
```
**Pre-conditions:** Claim has all required documents (provider-specific). Status = `draft` or `preauth`.
**Actions:**
- Dispatches to adapter: X12 837 (US), manual_panel (email + document set to TPA), MedIQ API (if contracted).
- Status → `submitted`.
- Records submission timestamp.

### 10.12 Get Claim Status
```
GET /insurance/claims/{claim_id}/status
Auth: PHR, MGR, ADM
```
Polls adapter for live status (X12 276/277) or returns last local status.

### 10.13 Post ERA (Electronic Remittance Advice)
```
POST /insurance/claims/era
Auth: ADM, ACC
Body: application/json or text/plain (X12 835 EDI)
```
Parses 835, matches to submitted claims, updates approved_amount, status.

### 10.14 Manually Update Claim Status
```
PATCH /insurance/claims/{claim_id}/status
Auth: MGR, ADM
```
**Body:** `{ "status": "paid", "approved_amount": 960.00, "notes": "Copay 20% deducted per policy" }`

### 10.15 Reject / Dispute Claim
```
POST /insurance/claims/{claim_id}/dispute
Auth: MGR, ADM
```
**Body:** `{ "reason": "...", "supporting_document_ids": [] }`

### 10.16 Get Claims Summary by Provider
```
GET /insurance/claims/summary?provider_id=&from=&to=
Auth: MGR, ADM, ACC
```
Returns: total claimed, approved, paid, rejected, pending — per provider.

### 10.17 Get Outstanding Insurance Receivables
```
GET /insurance/receivables?provider_id=&aging_days=30|60|90|90plus
Auth: ACC, ADM
```

### 10.18 Get Pre-Auth Templates (by provider)
```
GET /insurance/providers/{provider_id}/preauth-templates
Auth: PHR
```

---

---

# MODULE 11 — REPORTS & ANALYTICS

### 11.1 Sales Report
```
GET /reports/sales?branch_id=&from=&to=&group_by=day|week|month|category|medicine|cashier|sale_type&cashier_id=&format=json|csv|pdf
Auth: MGR, ADM, ACC
```
**Response (JSON):**
```json
{
  "summary": { "total_revenue": 1250000, "total_transactions": 3420, "avg_basket": 365.50, "total_discount": 45000, "total_tax": 212500 },
  "breakdown": [{ "period": "2025-06-01", "revenue": 45000, "transactions": 120, ... }]
}
```

### 11.2 Medicine Sales Report (top sellers / slow movers)
```
GET /reports/medicines/sales?branch_id=&from=&to=&sort=revenue|qty&limit=20&format=json|csv
Auth: MGR, ADM
```

### 11.3 Category Sales Report
```
GET /reports/categories/sales?branch_id=&from=&to=
Auth: MGR, ADM
```

### 11.4 Inventory Report
```
GET /reports/inventory?branch_id=&category=&format=json|csv|pdf
Auth: MGR, ADM, ACC
```
Returns: all medicines, batches, qty, cost value, MRP value, potential profit.

### 11.5 Expiry Report
```
GET /reports/expiry?branch_id=&expiry_before=&expiry_after=&include_zero_stock=false&format=json|csv|pdf
Auth: MGR, ADM, PHR
```

### 11.6 Near-Expiry Action Report
```
GET /reports/expiry/action?branch_id=&days=90
Auth: MGR, ADM
```
Groups: return-to-supplier candidates, write-off candidates, discount-to-clear candidates.

### 11.7 Profit & Loss Report
```
GET /reports/profit-loss?branch_id=&from=&to=&format=json|pdf
Auth: MGR, ADM, ACC
```
**Response:**
```json
{
  "revenue": 1250000,
  "cogs": 875000,
  "gross_profit": 375000,
  "gross_margin_pct": 30.0,
  "operating_expenses": {},
  "net_profit": 375000
}
```

### 11.8 Cash Flow Report
```
GET /reports/cash-flow?branch_id=&from=&to=&format=json|pdf
Auth: ADM, ACC
```

### 11.9 Purchase Report
```
GET /reports/purchases?branch_id=&supplier_id=&from=&to=&format=json|csv|pdf
Auth: MGR, ADM, ACC
```

### 11.10 Demand Forecast
```
GET /reports/demand-forecast?branch_id=&medicine_id=&days_ahead=30|60|90
Auth: MGR, ADM
```
Uses: moving average of last 90-day consumption. Returns: predicted qty needed + suggested reorder.

### 11.11 Controlled Substances Report
```
GET /reports/controlled-substances?branch_id=&medicine_id=&from=&to=&format=json|pdf
Auth: ADM, MGR
```
Perpetual register: opening balance, receipts, dispenses, adjustments, closing balance per medicine per day.

### 11.12 Insurance Claims Report
```
GET /reports/insurance?provider_id=&branch_id=&from=&to=&status=&format=json|csv|pdf
Auth: MGR, ADM, ACC
```

### 11.13 Patient Purchase Report
```
GET /reports/patients?branch_id=&from=&to=&sort=spend|visits&limit=20
Auth: MGR, ADM
```
Top customers by spend, visit frequency, avg basket.

### 11.14 Supplier Performance Report
```
GET /reports/suppliers?supplier_id=&from=&to=
Auth: MGR, ADM
```
Lead times, order fulfilment rate, return rate, total spend.

### 11.15 Cashier Performance Report
```
GET /reports/cashiers?branch_id=&from=&to=&cashier_id=
Auth: MGR, ADM
```
Per cashier: sales count, revenue, refunds, discount given, avg transaction time.

### 11.16 Tax / GST Report
```
GET /reports/tax?branch_id=&from=&to=&format=json|pdf
Auth: ACC, ADM
```

### 11.17 Stock Movement Report
```
GET /reports/stock-movement?medicine_id=&branch_id=&from=&to=&format=json|csv
Auth: MGR, ADM
```
All in/out movements per medicine: sales, GRN, adjustments, transfers.

### 11.18 Audit Trail Report
```
GET /reports/audit?user_id=&entity_type=&action=&from=&to=&page=&format=json|csv
Auth: ADM
```

### 11.19 Z-Report History
```
GET /reports/z-reports?branch_id=&from=&to=
Auth: MGR, ADM
```

### 11.20 Dashboard Summary (all modules)
```
GET /reports/dashboard?branch_id=&date=
Auth: MGR, ADM
```
Returns: all KPIs on a single call for homepage dashboard.

---

---

# MODULE 12 — ACCOUNTING INTEGRATION

### 12.1 QuickBooks OAuth Connect
```
GET /accounting/quickbooks/connect
Auth: ADM, ACC
```
Returns redirect URL to Intuit OAuth2 consent screen.

### 12.2 QuickBooks OAuth Callback
```
GET /accounting/quickbooks/callback?code=&realmId=&state=
Public (OAuth callback)
```
Exchanges code for tokens, stores encrypted in DB, associates with branch.

### 12.3 QuickBooks Disconnect
```
DELETE /accounting/quickbooks/disconnect?branch_id=
Auth: ADM
```

### 12.4 Get QuickBooks Connection Status
```
GET /accounting/quickbooks/status?branch_id=
Auth: ADM, ACC
```
Returns: connected, realmId, company name, token expiry.

### 12.5 Sync Sale to QuickBooks
```
POST /accounting/quickbooks/sync/sale/{sale_id}
Auth: ADM, ACC
```
Creates SalesReceipt (cash) or Invoice (credit) + Payment in QBO.

### 12.6 Sync GRN/Bill to QuickBooks
```
POST /accounting/quickbooks/sync/grn/{grn_id}
Auth: ADM, ACC
```
Creates Vendor Bill in QBO.

### 12.7 Sync Stock Adjustment (Write-Off) to QuickBooks
```
POST /accounting/quickbooks/sync/adjustment/{adjustment_id}
Auth: ADM, ACC
```
Creates JournalEntry: debit Inventory Adjustment / credit Inventory.

### 12.8 Bulk Sync to QuickBooks
```
POST /accounting/quickbooks/sync/bulk
Auth: ADM, ACC
```
**Body:**
```json
{ "branch_id": "uuid", "from": "2025-06-01", "to": "2025-06-15", "entity_types": ["sales","grns","adjustments"] }
```
**Response:** `{ "synced": 120, "skipped": 3, "errors": [] }`

### 12.9 Get QuickBooks Sync Log
```
GET /accounting/quickbooks/sync-log?branch_id=&from=&to=&status=success|error&page=
Auth: ADM, ACC
```

### 12.10 QuickBooks Webhook Receiver
```
POST /accounting/quickbooks/webhook
Public (Intuit webhook)
Header: intuit-signature (HMAC-SHA256 validate)
```

### 12.11 Xero OAuth Connect
```
GET /accounting/xero/connect
Auth: ADM, ACC
```

### 12.12 Xero OAuth Callback
```
GET /accounting/xero/callback?code=&state=
Public
```

### 12.13 Xero Disconnect
```
DELETE /accounting/xero/disconnect?branch_id=
Auth: ADM
```

### 12.14 Get Xero Connection Status
```
GET /accounting/xero/status?branch_id=
Auth: ADM, ACC
```

### 12.15 Sync Sale to Xero
```
POST /accounting/xero/sync/sale/{sale_id}
Auth: ADM, ACC
```

### 12.16 Sync GRN to Xero
```
POST /accounting/xero/sync/grn/{grn_id}
Auth: ADM, ACC
```

### 12.17 Bulk Sync to Xero
```
POST /accounting/xero/sync/bulk
Auth: ADM, ACC
```

### 12.18 Get Xero Sync Log
```
GET /accounting/xero/sync-log?branch_id=&from=&to=&page=
Auth: ADM, ACC
```

### 12.19 Xero Webhook Receiver
```
POST /accounting/xero/webhook
Public (Xero webhook)
Header: x-xero-signature (HMAC-SHA256 validate)
```

### 12.20 Get Chart of Accounts Mapping
```
GET /accounting/coa-mapping?platform=quickbooks|xero&branch_id=
Auth: ADM, ACC
```

### 12.21 Update Chart of Accounts Mapping
```
PUT /accounting/coa-mapping
Auth: ADM
```
**Body:**
```json
{
  "platform": "quickbooks", "branch_id": "uuid",
  "mapping": {
    "sales_revenue_account": "Sales",
    "cogs_account": "Cost of Goods Sold",
    "inventory_asset_account": "Inventory Asset",
    "tax_liability_account": "GST Payable",
    "discount_account": "Sales Discounts",
    "accounts_payable_account": "Accounts Payable",
    "accounts_receivable_account": "Accounts Receivable"
  }
}
```

---

---

# MODULE 13 — NOTIFICATIONS

### 13.1 List Notifications (inbox)
```
GET /notifications?type=&channel=&is_read=&page=
Auth: *
```

### 13.2 Mark Notification as Read
```
PATCH /notifications/{notification_id}/read
Auth: *
```

### 13.3 Mark All Notifications as Read
```
PATCH /notifications/read-all
Auth: *
```

### 13.4 Get Notification Preferences
```
GET /notifications/preferences
Auth: *
```

### 13.5 Update Notification Preferences
```
PUT /notifications/preferences
Auth: *
```
**Body:**
```json
{
  "low_stock": { "inapp": true, "whatsapp": true, "email": false, "sms": false },
  "expiry_alert": { "inapp": true, "whatsapp": true, "email": true },
  "prescription_ready": { "inapp": true, "sms": true },
  "claim_status_change": { "inapp": true, "email": true }
}
```

### 13.6 Send Manual Notification
```
POST /notifications/send
Auth: ADM, MGR
```
**Body:**
```json
{
  "recipient_type": "user|patient|branch",
  "recipient_id": "uuid",
  "channel": "whatsapp|sms|email|push",
  "template_id": "uuid",
  "template_vars": { "patient_name": "Fatima", "rx_number": "RX-001" }
}
```

### 13.7 List Notification Templates
```
GET /notifications/templates?type=
Auth: ADM, MGR
```

### 13.8 Create Notification Template
```
POST /notifications/templates
Auth: ADM
```
**Body:**
```json
{
  "name": "Prescription Ready",
  "type": "prescription_ready",
  "channel": "whatsapp",
  "template_id": "HX_META_TEMPLATE_ID",
  "body": "Hello {{patient_name}}, your prescription {{rx_number}} is ready for collection at {{branch_name}}.",
  "language": "en"
}
```

### 13.9 Update Notification Template
```
PUT /notifications/templates/{template_id}
Auth: ADM
```

### 13.10 Get Notification Dispatch Log
```
GET /notifications/log?from=&to=&channel=&status=pending|sent|failed&page=
Auth: ADM, MGR
```

### 13.11 Retry Failed Notification
```
POST /notifications/log/{log_id}/retry
Auth: ADM
```

---

---

# MODULE 14 — AUDIT LOGS

### 14.1 List Audit Logs
```
GET /audit?user_id=&action=&entity_type=medicine|sale|prescription|patient|user|...&entity_id=&ip_address=&from=&to=&page=&per_page=
Auth: ADM
```

### 14.2 Get Audit Log Entry
```
GET /audit/{log_id}
Auth: ADM
```
**Response includes:** before/after JSON diff of the entity.

### 14.3 Get Entity Audit Trail
```
GET /audit/entity/{entity_type}/{entity_id}
Auth: ADM, MGR
```
Full change history for a specific record.

### 14.4 Export Audit Logs
```
GET /audit/export?from=&to=&entity_type=&format=csv|pdf
Auth: ADM
```

---

---

# MODULE 15 — SETTINGS & CONFIGURATION

### 15.1 Get System Settings
```
GET /settings
Auth: ADM
```

### 15.2 Update System Settings
```
PUT /settings
Auth: ADM
```
**Body:**
```json
{
  "system_name": "RxPOS Pharmacy", "timezone": "Asia/Karachi",
  "currency": "PKR", "currency_symbol": "Rs.",
  "date_format": "DD/MM/YYYY", "time_format": "12h",
  "language": "en",
  "invoice_prefix": "INV", "po_prefix": "PO", "grn_prefix": "GRN",
  "tax_name": "GST", "default_tax_rate": 0.17,
  "mrp_enforcement": true,
  "prescription_required_enforcement": true,
  "interaction_check_enabled": true,
  "allergy_check_enabled": true,
  "fefo_enabled": true,
  "multi_branch_enabled": true
}
```

### 15.3 Get Integration Credentials
```
GET /settings/integrations
Auth: ADM
```
Returns masked credentials (API keys partially hidden).

### 15.4 Update Integration Credentials
```
PUT /settings/integrations
Auth: ADM
```
**Body:**
```json
{
  "openfda_api_key": "...",
  "drugbank_api_key": "...",
  "google_vision_credentials_json": "...",
  "aws_textract_access_key": "...",
  "aws_textract_secret_key": "...",
  "aws_region": "us-east-1",
  "twilio_account_sid": "...",
  "twilio_auth_token": "...",
  "twilio_whatsapp_number": "whatsapp:+14155238886",
  "sendgrid_api_key": "...",
  "fcm_server_key": "..."
}
```

### 15.5 Test Integration Credentials
```
POST /settings/integrations/test
Auth: ADM
```
**Body:** `{ "integration": "openfda|drugbank|google_vision|twilio|sendgrid" }`
**Response:** `{ "status": "ok|error", "message": "..." }`

### 15.6 Get Printer Configuration
```
GET /settings/printers?branch_id=
Auth: ADM, MGR
```

### 15.7 Create / Update Printer
```
POST /settings/printers
Auth: ADM
```
**Body:**
```json
{
  "name": "Counter 1 Printer", "branch_id": "uuid",
  "type": "escpos_network|escpos_usb|escpos_serial|pdf",
  "ip": "192.168.1.100", "port": 9100,
  "usb_vendor_id": null, "usb_product_id": null,
  "serial_port": null, "baud_rate": null,
  "paper_width": 80,
  "is_default": true
}
```

### 15.8 Test Printer
```
POST /settings/printers/{printer_id}/test
Auth: ADM, MGR
```
Sends a test page.

### 15.9 Get Tax Configuration
```
GET /settings/tax
Auth: ADM, ACC
```

### 15.10 Update Tax Configuration
```
PUT /settings/tax
Auth: ADM
```
**Body:**
```json
{
  "rules": [
    { "category": "Antibiotics", "tax_rate": 0.00, "tax_name": "GST Exempt" },
    { "category": "Cosmetics", "tax_rate": 0.17, "tax_name": "GST 17%" }
  ]
}
```

### 15.11 Get Receipt / Invoice Template
```
GET /settings/receipt-template?branch_id=
Auth: ADM, MGR
```

### 15.12 Update Receipt / Invoice Template
```
PUT /settings/receipt-template
Auth: ADM
```
**Body:**
```json
{
  "branch_id": "uuid",
  "header_lines": ["RxPOS Pharmacy","Gulberg III, Lahore","Tel: 042-111-000-000"],
  "footer_lines": ["Thank you for your visit!","www.rxpos.pk"],
  "show_generic_name": true,
  "show_batch_number": true,
  "show_expiry_date": true,
  "show_doctor_name": true,
  "show_tax_breakdown": true,
  "logo_url": null
}
```

### 15.13 Backup Database (manual trigger)
```
POST /settings/backup
Auth: ADM
```

### 15.14 Get System Health
```
GET /health
Public
```
**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "celery": "running",
  "timestamp": "2025-06-15T10:00:00Z",
  "version": "1.0.0"
}
```

---

---

# MODULE 16 — WEBSOCKETS

All WebSocket connections require a valid JWT passed as a query param:
```
ws://localhost:8000/ws/...?token=<access_token>
```

### WS 16.1 — General Notifications Channel
```
WS /ws/notifications?token=
```
**Server pushes:**
```json
{ "type": "LOW_STOCK", "medicine_id": "uuid", "medicine_name": "Augmentin", "current_qty": 8, "reorder_point": 50, "branch_id": "uuid" }
{ "type": "EXPIRY_ALERT", "batch_id": "uuid", "medicine_name": "...", "expiry_date": "2025-07-15", "days_left": 30 }
{ "type": "PRESCRIPTION_READY", "prescription_id": "uuid", "patient_name": "Fatima" }
{ "type": "CLAIM_STATUS", "claim_id": "uuid", "new_status": "paid", "approved_amount": 960.00 }
{ "type": "NEW_SALE", "sale_id": "uuid", "total": 700.00, "branch_id": "uuid" }
{ "type": "STOCK_ADJUSTED", "batch_id": "uuid", "adjustment_type": "damage", "qty_change": -5 }
```

### WS 16.2 — POS Live Channel (per branch)
```
WS /ws/pos/{branch_id}?token=
```
Multi-terminal sync. Server pushes after every sale, adjustment, GRN receive:
```json
{ "type": "STOCK_UPDATED", "updates": [{ "medicine_id": "uuid", "available_qty": 43 }] }
{ "type": "PRICE_UPDATED", "medicine_id": "uuid", "new_mrp": 375.00 }
{ "type": "MEDICINE_OUT_OF_STOCK", "medicine_id": "uuid", "medicine_name": "..." }
{ "type": "GRN_RECEIVED", "medicine_ids": ["uuid1","uuid2"], "branch_id": "uuid" }
```
**Client can send:**
```json
{ "type": "HEARTBEAT" }
{ "type": "REQUEST_STOCK_UPDATE", "medicine_ids": ["uuid1","uuid2"] }
```

### WS 16.3 — Prescription Status Channel
```
WS /ws/prescriptions?token=
```
Pushes status changes: `received → verified → filled → dispensed → collected`.

### WS 16.4 — Admin Live Dashboard
```
WS /ws/dashboard/{branch_id}?token=
Auth: MGR, ADM
```
Pushes KPI updates every 60 seconds and on each sale:
```json
{ "type": "KPI_UPDATE", "today_revenue": 125000, "transactions": 342, "avg_basket": 365.50 }
```

---

---

# MODULE 17 — CELERY BACKGROUND TASKS

These are internal tasks (not HTTP endpoints) triggered by schedule or events. Documented here for Replit AI to implement.

| Task | Trigger | Action |
|------|---------|--------|
| `check_low_stock` | Every 1 hour | For each branch: find medicines below reorder_point → push WS + create notification |
| `check_expiry_alerts` | Every day 7AM | Find batches expiring in 30/60/90 days → push WS + notify MGR |
| `sync_openfda_enrichments` | Weekly | Re-enrich stale medicines (>30 days since last enrichment) |
| `send_pending_notifications` | Every 5 min | Pick pending notifications → dispatch via channel (Twilio/SendGrid/FCM) |
| `sync_accounting_quickbooks` | Daily midnight | Auto-sync yesterday's sales/GRNs if auto-sync enabled |
| `sync_accounting_xero` | Daily midnight | Same for Xero |
| `poll_insurance_claim_status` | Every 4 hours | For `submitted` X12 claims → poll 276/277 → update status |
| `generate_reorder_suggestions` | Daily 6AM | Run demand forecast → update suggested_reorder_qty on medicines |
| `controlled_substance_reconciliation_reminder` | Monthly (1st) | Notify ADM/MGR to run monthly reconciliation |
| `cleanup_expired_tokens` | Daily | Remove expired JWT blacklist entries from Redis |
| `database_backup` | Daily 2AM | pg_dump → encrypt → upload to S3/local storage |

---

---

# ENDPOINT COUNT SUMMARY

| Module | Endpoint Count |
|--------|---------------|
| Auth & Session | 10 |
| Users & Staff | 10 |
| Branches | 8 |
| Medicine/Drug Master | 22 |
| Inventory | 19 |
| Patients/Customers | 18 |
| Prescriptions | 18 |
| Point of Sale | 22 |
| Suppliers & Purchasing | 23 |
| Insurance & TPA | 18 |
| Reports & Analytics | 20 |
| Accounting Integration | 21 |
| Notifications | 11 |
| Audit Logs | 4 |
| Settings & Configuration | 14 |
| WebSockets | 4 channels |
| Celery Tasks | 10 tasks |
| **TOTAL HTTP** | **242 endpoints** |
| **TOTAL WS** | **4 channels** |
| **TOTAL TASKS** | **10 async tasks** |

---

*End of Complete API Specification. This document is the single source of truth. Replit AI must implement every endpoint above — no skipping, no placeholders.*
