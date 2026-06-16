---
name: Prescription selector in POS
description: Rx items in the POS cart require a prescription to be linked before checkout can proceed
---

## The rule
When any cart item has `requires_prescription: true`, the POS must:
1. Show a prescription selector UI (patient must be selected first)
2. Block checkout (`return` after toast) if no prescription is linked

**Why:** Dispensing Rx medicines without a linked prescription violates pharmacy workflow rules. The original code showed a toast warning but did not block the sale.

**How to apply:**
- Use `useListPrescriptions({ patient_id: selectedPatient?.id })` enabled only when a patient is selected and the cart has Rx items
- Render a `<Select>` dropdown below the patient selector when `needsRx && selectedPatient`
- Show a guidance message when `needsRx && !selectedPatient` ("Select a patient to link their prescription")
- In `handleCompleteSale`: add `return;` after the toast for missing prescription
