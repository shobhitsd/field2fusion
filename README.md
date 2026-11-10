# FIELD2FUSION · Enterprise Asset Collection

> **Offline-first, enterprise-grade asset collection, validation, and reconciliation progressive web app (PWA) built for field walkthroughs and Oracle Fusion Cloud Maintenance integration.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 🌾 Overview

**FIELD2FUSION** bridges the physical gap between agricultural facilities (farms, feed mills, truck washes, corporate offices) and **Oracle Fusion Cloud Maintenance**. 

Field technicians operating in rural metal barns and industrial facilities with **zero cellular connectivity** can record equipment inventories, capture nameplate photos, input serial numbers, and validate compliance on the spot. Once reconnected, supervisors review and approve collections before generating official **122-column Oracle FBDI spreadsheets** or synchronizing with Oracle Cloud REST APIs.

---

## 🚀 One-Click Deploy to Vercel

This repository is pre-configured and 100% **Vercel-ready** with [`vercel.json`](./vercel.json) (SPA route rewrites, PWA headers, and zero-config Vite bundling).

### Option 1: Deploy via Vercel Web Dashboard (Recommended)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import this GitHub repository (`field2fusion`).
3. Vercel automatically detects **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**. Your live PWA URL will be ready in under 60 seconds!

### Option 2: Deploy via Vercel CLI
If you have the [Vercel CLI](https://vercel.com/cli) installed:
```bash
# Log in to your Vercel account
vercel login

# Deploy directly from the project directory
vercel
```

---

## ✨ Key Enterprise Capabilities

### 1. 100% Offline-First Architecture (PWA + IndexedDB)
- **Zero-Signal Reliability**: The application shell and all 500+ equipment definitions are precached by a Workbox Service Worker (`sw.js`).
- **Local Transactional Persistence**: Keystrokes, drafts, confirmed units, and photos commit transactionally to browser **IndexedDB** using Dexie.js. Data is never lost if battery dies or connection drops.
- **Outbox Sync Queue**: Disconnected changes queue in a persistent outbox and sync automatically once network connectivity is re-established.

### 2. Standard 122-Column Oracle FBDI Export (`CSI_ITEM_INSTANCES_INT`)
- Implements the exact 122-column specification demanded by Oracle Cloud Maintenance's Installed Base Asset Load interface table.
- **Two Export Formats**:
  - **With Headers**: For ETL tools, data staging tables, and automated pipelines.
  - **Without Headers**: Ready to paste directly into **Row 7** of Oracle's official `CSI_ITEM_INSTANCES_INT.xlsm` template without header collisions or macro corruption.

### 3. Oracle Cloud REST API Sync & Reconciliation Engine
- Simulates live Oracle Fusion REST API batch submission (`submitToOracleApi`).
- Generates official enterprise tracking jobs (`ORA_JOB_XXXXXX`).
- Assigns persistent Oracle Asset Numbers (`ORA-AST-XXXXXX` and `ORA-UNT-XXXXXX`).
- **Error Isolation & Retry**: Allows technicians and reviewers to test rejected rows and retry failed records without duplicating already-confirmed assets.

### 4. Microsoft Entra ID (Azure AD) SSO & Role-Based Access Control (RBAC)
- Built-in multi-persona switcher in the top navigation:
  - **Alex Morgan (Field Technician)**: Restricted to assigned sites (`AUTH-07` / `UAT-20`). Unassigned sites are locked to read-only view.
  - **Daniel Evans (Asset Supervisor & Reviewer)**: Reviews photos, approves collections, and generates export batches.
  - **Jordan Reed (Enterprise Oracle Administrator)**: Authorized to edit catalog definitions and upload master data files (`AUTH-03`).

### 5. Nameplate Photo Documentation
- Direct camera capture and image file attachment on every equipment item sheet.
- Instant responsive thumbnail previews with image count badges on walk rows.

### 6. Diagram-Aligned Hierarchy (Feed Mill, Truck Wash, Office, Farm)
- 550+ master equipment definitions classified into official engineering parent systems derived from Christensen Farms' architectural Visio diagrams:
  - **Feed Mill**: `Receiving`, `Batching/Grinding`, `Pelleting`, `Loadout`, `Electrical`, `BAS`, `Mechanical`.
  - **Truck Wash**: `Wash Bays`, `BioDri Thermal Baking Bays`, `Mechanical Room`.
  - **Farm**: `Farrowing`, `Nursery`, `Gestation`, `Finishing`, `Site`.
  - **Office**: `Safety & Security`, `Electrical`, `HVAC / BAS`, `Balance of Asset`.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript (Strict mode) |
| **Bundler & Build Tool**| Vite 7 |
| **Styling** | Tailwind CSS v4 |
| **Local Database** | Dexie.js 4 (IndexedDB wrapper) |
| **State & Cache** | TanStack Query v5 (`networkMode: always`) |
| **UI Primitives** | Radix UI + Lucide React |
| **Offline PWA** | `vite-plugin-pwa` + Workbox |
| **Spreadsheet Parsing**| PapaParse (CSV) + read-excel-file (XLSX) |
| **Unit Testing** | Vitest 5 |
| **E2E Testing** | Playwright |

---

## 💻 Local Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/shobhitsd/field2fusion.git
cd field2fusion

# Install dependencies
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Test Suite
```bash
# Run Vitest unit tests (DB transactions, FBDI 122-col verification, RBAC personas)
npx vitest run src/db.test.ts src/workflow.test.ts
```

### 5. Production Build & Preview
```bash
# Build production bundle with TypeScript checking
npm run build

# Preview production build locally
npx vite preview
```

---

## 📄 License
Internal proprietary software for Christensen Farms enterprise asset collection and Oracle Cloud integration.
