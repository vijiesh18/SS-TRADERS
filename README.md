# S.S Traders Smart POS

Enterprise-grade Smart POS for a paint shop, motors, borewell, and hardware
business — GST billing, inventory management, Asian Paints product search,
barcode scanning, credit management, device-WhatsApp invoice sharing,
analytics, reports, and full database backup/restore.

**Business:** S.S Traders &middot; GSTIN `33NQAPS4337D1ZS` &middot; Phone `6383019535`

---

## Project Structure

```
ss-traders-pos/
├── backend/    Node.js + Express + Prisma (PostgreSQL) API
└── frontend/   Next.js (App Router) + Tailwind + ShadCN UI
```

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, ShadCN UI, React Query, Zustand, Recharts, ZXing
- **Backend:** Node.js, Express.js, Prisma ORM, JWT auth, RBAC
- **Database:** PostgreSQL (Supabase-compatible)
- **PDF:** PDFKit (invoices, reports)
- **Barcode:** ZXing (camera scanning), USB scanners work as keyboard input

## Getting Started

### 1. Database

Provision a PostgreSQL database (locally or via Supabase) and copy the
connection string.

### 2. Backend setup

```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL, JWT secrets, etc.
npm install
npm run db:generate
npm run db:migrate          # creates all tables
npm run db:seed             # creates admin/staff/accountant users + sample Asian Paints catalog
npm run dev                  # starts API on http://localhost:4000
```

Seeded login credentials:

| Role       | Email                     | Password      |
|------------|---------------------------|----------------|
| Admin      | admin@sstraders.com       | Admin@123      |
| Staff      | staff@sstraders.com       | Staff@123      |
| Accountant | accounts@sstraders.com    | Account@123    |

> Change these passwords immediately in production.

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL
npm install
npm run dev                  # starts app on http://localhost:3000
```

## Roles & Permissions

| Role       | Access |
|------------|--------|
| **ADMIN**       | Full access, export data, backups/restore, delete products, cancel invoices, manage users |
| **STAFF**       | Billing, customer management, inventory view, estimate creation |
| **ACCOUNTANT**  | Reports, GST reports, credit management, profit reports |

## Core Modules Implemented (Backend API)

- Auth: login, logout, refresh, forgot/reset password, audit-logged sessions
- Products: CRUD, Google-style autocomplete search (name/barcode/code/shade/brand), barcode lookup, "frequently bought together" recommendations
- Inventory: stock adjustments, low-stock alerts, dead-stock & fast-moving analysis, movement history
- Billing: GST calculation (CGST/SGST split), invoice generation with sequential `SST-YYYY-NNNNNN` numbering, stock deduction, hold/resume bills, invoice cancellation with restock, PDF invoice + QR code, device WhatsApp deep link
- Estimates: `EST-YYYY-NNNNNN` numbering, convert-to-invoice
- Customers / Suppliers: CRUD, ledgers, purchase history
- Purchases: stock-in, supplier balance tracking
- Credit Management: pending/due-today/overdue tracking, payment recording
- Expenses: categorized tracking (Salary, Rent, Electricity, Transport, Misc)
- Reports: sales, profit, GST, inventory, customer, credit — export to PDF/Excel/CSV
- Data Export module: products, customers, invoices, inventory, expenses, credit, suppliers
- Backup Center: manual/daily/weekly full DB backup ZIP, download, restore
- Audit Logs: login, invoice edits/cancellations, product & stock changes
- Soft delete everywhere (products, invoices) with restore capability
- Settings: business info, GST config, invoice numbering, backup schedule

## Frontend Implemented

- JWT login with persisted session (Zustand) and auto-refresh (Axios interceptor)
- Role-based sidebar navigation (dark sidebar / light workspace per design spec)
- Dashboard: all analytics cards, revenue/category/product charts with daily/weekly/monthly/yearly filters
- Billing POS: live product autocomplete, cart with discount/qty controls, live GST totals, hold/resume bills, frequently-bought-together suggestions, invoice generation with Print/PDF/WhatsApp actions
- Estimates: create with customer/product search, status tabs, convert-to-invoice with payment method/credit
- Products: catalog table with filters/low-stock badges, add/edit dialog, CSV bulk import (Asian Paints-ready) with template download
- Inventory: low stock / dead stock / fast moving tabs, stock adjustment dialog, per-product movement history
- Customers: searchable directory, add/edit, ledger dialog with spend analytics, purchase & credit history
- Suppliers: directory with outstanding balances, add/edit, purchase history dialog
- Purchases: paginated list with balance badges, new purchase entry (supplier + line items, auto stock-in)
- Credit Management: summary cards, all/due-today/overdue filters, expandable records, payment recording
- Expenses: date-range & category filters, summary cards, add/delete
- Reports: sales, profit, GST, inventory, customers, credit — tabbed with PDF/Excel/CSV export
- Data Export: per-entity export cards (products, customers, invoices, inventory, expenses, credit, suppliers)
- Backup Center: create/download backups, history table, guarded restore flow
- Settings: business details, GST config, invoice/estimate numbering, backup schedule (Admin-editable)
- Users: Admin-only CRUD with role assignment, password reset, activate/deactivate
- Audit Logs: Admin-only filterable activity trail with expandable details

> Note: camera-based barcode scanning (ZXing) was intentionally skipped in this build. USB barcode
> scanners still work out of the box since they emit keyboard input into the product search field.

---

© 2026 S.S Traders Smart POS | Designed & Curated by Vijiesh
