---
name: Inventory batch admin branch
description: Add Batch dialog needs a branch selector for admin users who have no pre-assigned branch
---

## The rule
Admin and super_admin users have `user.branch_id = null`. The Add Batch form has `branch_id` as a required field, so admins will always fail validation unless a branch selector is shown.

**Why:** The form pre-fills `branch_id` from `user.branch_id ?? ""`. For admins, this is `""` which fails `z.string().min(1)` validation silently.

**How to apply:**
- Add `useListBranches()` call in the Inventory component
- Conditionally render a branch `<Select>` field in the Add Batch dialog: `{!branchId && <FormField name="branch_id" .../> }`
- The same pattern applies to any form that takes branch_id as a required field
