# RentPro QA / Test Report

**Project:** RentPro Rental Management App  
**Report date:** 16-Nov-2026  
**Test approach:** Node.js built-in test runner; calculation unit tests, Supertest API integration tests, and Mongoose MongoDB schema tests.

## Execution summary

| Test suite | Cases | Passed | Failed | Status |
|---|---:|---:|---:|---|
| Billing calculator unit tests | 4 | 4 | 0 | PASS |
| API integration suite (Supertest & Auth) | 9 | 9 | 0 | PASS |
| MongoDB integration & Mongoose schema suite | 7 | 7 | 0 | PASS |
| **Total** | **20** | **20** | **0** | **PASS (100%)** |

Test command executed:

```text
npm test
# tests 20, pass 20, fail 0
```

## MongoDB & Schema Test Coverage

1. All 13 Mongoose models (`Property`, `Flat`, `Tenant`, `Lease`, `Bill`, `Maintenance`, `Accounting`, `Staff`, `Vendor`, `Document`, `Notification`, `AuditLog`, `Setting`) loaded and initialized — PASS.
2. Flat model schema validates required fields, unit uniqueness, and non-negative constraints — PASS.
3. Flat model rejects invalid/negative rents — PASS.
4. Bill model validates itemized line charges, utility rates, and payments ledger — PASS.
5. `getConnectionInfo` returns configured status, models list, and connection metadata — PASS.
6. `GET /api/database/status` endpoint provides real-time database engine state and collection counts — PASS.
7. `GET /api/health` reports database type and connectivity status — PASS.
