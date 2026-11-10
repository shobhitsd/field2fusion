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

The included catalog contains the three requested assets. JSON import supports new site records; catalog and room templates are versioned in source.
