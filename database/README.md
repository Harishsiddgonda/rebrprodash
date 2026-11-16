# RentPro Database

RentPro features dual-layer database architecture:
1. **MongoDB Database (Production & Cloud)**: Full Mongoose ODM integration supporting local MongoDB instances and cloud MongoDB Atlas clusters.
2. **Persistent JSON Document Store (Zero-Config Fallback)**: Built-in file-backed store at `backend/data.json` that runs out-of-the-box with zero database installation required.

---

## Connecting MongoDB

Configure the connection string in `backend/.env` (or environment variables in Render/Docker):

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/rentpro

# OR MongoDB Atlas Cloud
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/rentpro?retryWrites=true&w=majority
```

When `MONGODB_URI` is provided, RentPro automatically:
1. Connects to MongoDB on startup.
2. Auto-seeds empty MongoDB collections from `backend/data.json` so you immediately have initial units, tenants, and utility tariffs.
3. Synchronizes updates to MongoDB collections in real-time.
4. Maintains `backend/data.json` as a local fail-safe snapshot.

If `MONGODB_URI` is unset or MongoDB is temporarily unreachable, RentPro seamlessly falls back to `backend/data.json`.

---

## Mongoose Schemas & Collections

All models are located in [`backend/src/models/`](../backend/src/models/):

| Model | Collection | Primary Keys & Indexes | Description |
|---|---|---|---|
| `Property` | `properties` | `id` (unique), `code` | Real-estate buildings and complexes |
| `Flat` | `flats` | `id` (unique), `flatNumber` (unique), `propertyId` | Individual units, rental amounts & meter readings |
| `Tenant` | `tenants` | `id` (unique), `flatId`, `propertyId` | Tenant contact info, KYC verification status |
| `Lease` | `leases` | `id` (unique), `leaseNumber`, `flatId`, `tenantId` | Tenancy agreements, expiry dates, deposits |
| `Bill` | `bills` | `id` (unique), `flatId`, `month` | Monthly itemized utility and rent invoices |
| `Maintenance` | `maintenances` | `id` (unique), `ticketNumber` | Repair work orders and technician assignments |
| `Accounting` | `accountings` | `id` (unique), `type`, `date` | Income, expense, and liability transactions |
| `Staff` | `staffs` | `id` (unique), `assignedProperty` | Operations managers and technicians |
| `Vendor` | `vendors` | `id` (unique), `category` | Maintenance contractors and service providers |
| `Document` | `documents` | `id` (unique) | Lease agreements and safety compliance records |
| `Notification` | `notifications` | `id` (unique) | System alerts and billing reminders |
| `AuditLog` | `auditlogs` | `id` (unique), `timestamp` | Security and administrative audit trail |
| `Setting` | `settings` | `key: 'global'` (unique) | Electricity/water tariffs and auto-increment counters |

---

## Database Management Endpoints

- `GET /api/health` — Checks database health, storage type (`mongodb` or `json`), and counts.
- `GET /api/database/status` — Returns detailed MongoDB connection state, host, database name, and model counts.
- `POST /api/database/sync` — Forces synchronization of all in-memory records into MongoDB.

---

## Running with Docker MongoDB

A ready-to-run MongoDB 7 container is included in [`docker-compose.yml`](../docker-compose.yml):

```bash
docker compose up -d
```
This boots up both RentPro API on port `4000` and MongoDB on port `27017` with persistent data volumes.
