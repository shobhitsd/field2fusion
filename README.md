# FIELD2FUSION

React + TypeScript + Vite, Tailwind CSS, shadcn-style Radix UI primitives, Lucide, Dexie, and TanStack Query.

## Run

```sh
npm ci
npm run dev
```

`npm run build` produces `dist`. Serve that folder over HTTPS (or localhost) with SPA fallback to index.html. `npm test` checks database integrity and offline outbox behavior.

## Offline architecture

All persisted domain reads/writes use IndexedDB via Dexie. TanStack Query uses `networkMode: always` so disconnected writes execute immediately. Equipment updates, expected counts, site progress, units and outbox entries commit in one transaction. Failed writes roll back optimistic UI. The Workbox service worker precaches the application shell; visit once online and allow service worker installation before disconnecting. No external fonts or runtime CDN dependencies.

Category A requires unique serials for each unit. Category B creates per-unit records without serials. Category C stores a single bulk quantity. Setup is immutable after generating a collection. Review validates all locations, requires confirmation, install date and manufacturer, detects duplicate serials across the site, and excludes not-present equipment. CSVs escape quotes and spreadsheet formulas; A/B emit one row per unit and C emits a bulk row. Batch timestamps use Asia/Kolkata.

## Integration boundary

Background sync is deliberately simulated as requested. It acknowledges and removes queued operations after a delay when online. It does not send records to an enterprise system. Replace the mock acknowledgement in `drainQueue` with authenticated, idempotent server acknowledgements before using this as a shared enterprise system. User DE is a demonstration identity and admin views are local utilities, not an authorization boundary. Browser storage is device/profile-specific and may be cleared; download CSV backups. Production rollout needs organization-specific authentication, permissions, retention, recovery and real sync integration.

The original sample collection is preserved. The reference catalog now contains 550 definitions derived from the supplied equipment workbook and facility diagrams. Administrators can preview and import CSV/Excel site and equipment-template files. Duplicate SITE_ID rows may represent distinct site-role assignments; these are retained separately. Existing collections keep their generated equipment list.

## Updated workflow

The larger interface guides users through setup, collection, review/approval and export. Drafts are stored locally while typing. Reviewers can return a collection or an individual record with comments. Site and equipment edits reset approval. Export downloads are retained with unique batch codes; subsequent cycles retain prior inventory snapshots and show changes.

The available CSV is a collection handoff format. It is **not** an Oracle-validated FBDI file: the production Asset Load schema is not in the supplied folder. Entra ID, backend synchronization, Oracle submission/reconciliation and organization permissions remain integration boundaries, clearly described in [the project review](docs/PROJECT-REVIEW.md).

Run `npm run test:e2e` against `npx vite preview --host 127.0.0.1 --port 4173` after building. The Playwright configuration uses the local Chrome installation; adjust its executable path on another machine. `npm test` runs the IndexedDB/workflow tests.
