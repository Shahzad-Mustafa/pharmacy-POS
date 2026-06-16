---
name: POS sale response nesting
description: The createSale endpoint wraps SaleResponse in a container object, not a bare SaleResponse
---

## The rule
After calling `createSale`, the response is `{ sale: SaleResponse, warnings: [], stock_updated: [] }`. The invoice number and other sale fields are inside `data.sale`, not at `data` directly.

**Why:** The backend returns extra metadata (warnings, stock_updated items) alongside the sale record. The generated type says `SaleResponse` but the real payload is nested.

**How to apply:** In any `onSuccess` handler for `createSale`, extract with:
```js
const saleObj = data?.sale ?? data;
const invoiceNum = saleObj?.invoiceNumber ?? saleObj?.invoice_number;
```
The double-alias (`invoiceNumber ?? invoice_number`) is needed because the backend uses snake_case but some fields may be camelCased through serialization.
