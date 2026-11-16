# RentPro — Enterprise Edition
## Smart Property. Seamless Management.

RentPro is a commercial-grade, multi-property residential and commercial management platform featuring property operations, tenant lifecycle, automated utility billing (electricity, water, sanitation), lease agreements, payment ledgers, work order maintenance, accounting & cash flow analytics, downloadable PDF invoices, and CSV data exports.

---

## 🎨 1. Brand Identity & Design System

- **Brand Name:** RentPro
- **Tagline:** Smart Property. Seamless Management.
- **Brand Palette:**
  - Midnight Navy: `#162846`
  - Deep Slate: `#1E293B`
  - Primary Blue: `#2563EB`
  - Sky Blue: `#60A5FA`
  - Surface Background: `#F8FAFC`
  - Card White: `#FFFFFF`
  - Success Green: `#16A34A`
  - Warning Amber: `#F59E0B`
  - Danger Red: `#DC2626`
- **Branding Assets:**
  - [mobile/assets/logo.svg](file:///c:/Users/HarishRuler/Downloads/rentpro/mobile/assets/logo.svg) — Full vector logo
  - [mobile/assets/logo-white.svg](file:///c:/Users/HarishRuler/Downloads/rentpro/mobile/assets/logo-white.svg) — White vector wordmark for dark navy backgrounds
  - [mobile/assets/logo-compact.svg](file:///c:/Users/HarishRuler/Downloads/rentpro/mobile/assets/logo-compact.svg) — Compact app icon / mark

---

## 🚀 2. Enterprise System Modules

### 1. Executive Telemetry Dashboard
- **Real-Time KPIs:** Total Units, Active Tenants, Collection Rate, Pending Receivables, Active Work Orders, Leases Expiring Soon, Net Operating Income, and Escrow Deposit Liabilities.
- **Recent Collections Feed:** Live transaction feed showing tenant name, flat number, amount, payment method (UPI, Cash, Bank Transfer), and payment date.
- **Maintenance Radar:** High, Medium, and Low priority work orders with direct resolution shortcuts.

### 2. Multi-Property Operations
- Support for multiple properties, blocks, and apartment complexes (e.g. *Skyline Residency*, *Greenwood Palms*).
- Property codes, addresses, manager assignments, and unit capacities.

### 3. Unit & Flat Directory
- Unit directory with status badges (`Occupied`, `Vacant Ready`, `Under Maintenance`).
- Base monthly rental tariffs, security deposits held, and opening utility meter records.
- Reusable modal to add and update units.

### 4. Tenant Lifecycle Management
- Track complete resident lifecycle: `Applicant` → `Active Resident` → `Notice Given` → `Former Tenant`.
- Resident profiles with KYC verification badges, contact information, emergency contacts, and vehicle registration numbers.

### 5. Lease & Agreement Management
- Active lease agreement tracking with automated expiration countdowns (90-day alert window).
- Security deposits held, annual escalation terms (e.g., 5-6% annual increase), and overlap protection.

### 6. Meter Reading & Utility Invoicing
- Dedicated readings pipeline for Electricity (kWh) and Water (kL) meters.
- Automatic carry-forward validation against previous billing months.
- Configurable tariffs (Electricity: ₹8/kWh, Water: ₹30/kL, Fixed Sanitation: ₹125/flat).
- Generation of itemized PDF invoices (`pdfkit`) and monthly CSV billing summaries.

### 7. Multi-Channel Payment Collections
- Verified payment recording supporting UPI, Cash, Bank Transfer, Cheque, and Cards.
- Partial payment support with automatic balance calculations.
- Live status tags: `PAID`, `PARTIAL`, `PENDING`.

### 8. Accounting & Financial Management
- Profit & Loss overview: Total Operating Income vs. Operating Expenses.
- Escrow deposit liability tracking (refundable tenant deposits treated as balance-sheet liabilities, not revenue).
- General ledger for utility power bills (BESCOM), elevator AMC contracts (Otis), and facility security (SafeGuard).

### 9. Maintenance & Work Order Platform
- Tenant and admin work order requests categorized by discipline: `Electrical`, `HVAC`, `Plumbing`, `Carpentry`, `Turnover`.
- Priority-based dispatch (`Emergency`, `High`, `Medium`, `Low`) with estimated and actual repair costs.
- Direct status transitions: `Submitted` → `Assigned` → `In Progress` → `Completed`.

### 10. Tenant Self-Service Portal
- Dedicated resident mode where tenants can review their leased unit, view rental statements, download official PDF invoices, submit repair requests, and make payments.

### 11. Reports & Business Intelligence
- Downloadable CSV ledgers:
  - `GET /api/export/:month.csv` — Monthly billing summary
  - `GET /api/export/tenants.csv` — Resident roster & KYC
  - `GET /api/export/maintenance.csv` — Work order and facility logs

### 12. Security & Audit Logging
- Role-based access control with optional JWT Bearer token authentication.
- Detailed audit logs capturing user actions, timestamps, and IP addresses.
- In-app notification center with unread badges.

---

## 🗄️ Database Architecture (MongoDB & JSON)

RentPro supports **MongoDB** (Cloud Atlas or Local) as its primary database, with zero-dependency persistent JSON fallback:

- **Mongoose ODM Models**: Schemas for `Property`, `Flat`, `Tenant`, `Lease`, `Bill`, `Maintenance`, `Accounting`, `Staff`, `Vendor`, `Document`, `Notification`, `AuditLog`, and `Setting` in [`backend/src/models/`](backend/src/models/).
- **Connecting MongoDB**: Add your connection string in `backend/.env`:
  ```env
  MONGODB_URI=mongodb://localhost:27017/rentpro
  # Or MongoDB Atlas:
  # MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/rentpro?retryWrites=true&w=majority
  ```
- **Auto-Sync & Auto-Seed**: On first connect, MongoDB is automatically populated from the existing seed data.
- **Health & Diagnostics**: Check database engine live at `GET /api/database/status` or `GET /api/health`.

---

## 💻 3. Quick Start & Windows PowerShell Commands

### Start All Services:
```powershell
# 1. Build the frontend web bundle
npm run build:frontend

# 2. Start the unified backend & web server
npm start
```
* Access the web dashboard at **[http://localhost:4000](http://localhost:4000)**.
* Access the API health check at **[http://localhost:4000/health](http://localhost:4000/health)**.

### Run in Separate Terminals (Development Mode):
- **Terminal 1 (Backend API with live watch):**
  ```powershell
  cd backend; npm run dev
  ```
- **Terminal 2 (Frontend with Expo Metro hot-reload):**
  ```powershell
  cd mobile; npm run web
  ```

---

## 📱 4. Standalone Android APK

The standalone Android APK is built and ready:
- **Local File:** [RentPro.apk](file:///c:/Users/HarishRuler/Downloads/rentpro/RentPro.apk)
- **Direct Browser Download:** [http://localhost:4000/RentPro.apk](http://localhost:4000/RentPro.apk)
- **Wi-Fi Mobile Download:** `http://192.168.1.8:4000/RentPro.apk`
