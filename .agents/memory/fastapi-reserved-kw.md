---
name: FastAPI reserved-keyword params
description: How to handle Python reserved keywords as FastAPI query params (e.g. from/to date ranges)
---

## The rule
Use `Query(None, alias="from")` / `Query(None, alias="to")` to receive query params whose names are Python keywords.

**Why:** FastAPI/Python cannot use `from` as a regular function parameter because it is a reserved keyword. The `alias` argument in `Query(...)` lets the client send `?from=2024-01-01` while the server receives it as a non-keyword name.

**How to apply:** Any endpoint accepting date-range parameters named `from`/`to` must declare them with aliases:
```python
date_from: Optional[str] = Query(None, alias="from")
date_to:   Optional[str] = Query(None, alias="to")
```
The frontend generated client uses the spec field names (`from`, `to`) so they match automatically.
