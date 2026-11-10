# FIELD2FUSION — project material review and implementation

Reviewed 10 November 2026. The user manual and requirements document were the primary references; the supplied workbook, four Visio files, and three recordings were supporting evidence.

## Material reviewed

| Source | Review coverage | Findings used |
|---|---|---|
| Asset-Collector-User-Manual.pdf | All 23 pages, including field instructions, role descriptions, review, imports, and limitations | Guided setup/walk/review/export; blank-only bulk dates; explicit not-present undo; catalog-first adding; custom deletion confirmation; site details; focus-on-fix; download history; whole-site workspace |
| Asset_Collector_Requirements_Document_v0.1.docx | Full document, including all functional requirements, assumptions, dependencies and UAT scenarios | Offline drafts; approval gate; review comments; repeated site/contact roles; template snapshots; incremental import preview; subsequent assessment comparisons; honest integration state |
| Oracle Equipment Specifications.xlsx | All populated cells in all three sheets: SE TW, C15 - Site, ABC | 66 truck-wash rows and 732 farm rows; 47 and 207 distinct location/equipment definitions respectively; A/B/C conditional collection; installation dates, model, capacity, dimensions and warranty metadata |
| Oracle Maintenance Visio New-Deloitte.vsdx | All page text, deduplicated equipment and location lists | Farm functional locations, shared/site equipment, systems and subsystems; source categories can differ from demo fixtures |
| Oracle Maintenance Visio New-Feed Mill - Jackie M.vsdx | All page text and equipment classifications | Receiving, batching/grinding and loadout; facility-specific equipment; ambiguous classifications need review |
| Oracle Maintenance Visio New-Office.vsdx | All page text and equipment classifications | Office-specific mechanical, electrical, building, IT and automation equipment |
| Oracle Maintenance Visio New-Truck Wash - Jackie M.vsdx | All page text and equipment classifications | Wash and Biodri equipment, shared safety/electrical assets |
| Discussion Field Service Asset Collector — 15 October 2026 | Full audio transcribed locally (32m 29s); screen-share frames sampled every three minutes | Around 02:40: picklists, bulk creation, ABC, autosave. Around 03:55: FBDI validation and hierarchy. Around 20:15–23:25: local continuity through lost connectivity. Oracle ownership and integration dependencies discussed explicitly. |
| IT App Alignment — Asset Collector Requirements — 7 October 2026 | Full audio transcribed locally (23m 07s); screen-share frames sampled every three minutes | Four different facility flows; dynamic fields by category; quantity expansion; state saved between sessions; three-stage prototype; hierarchy is central to Oracle correctness. |
| IT App Exploration — Comprehensive Site Assessment / Oracle R3 — 4 September 2026 | Full audio transcribed locally (29m 45s); screen-share frames sampled every three minutes | Equipment collection is separate from Smartsheet assessment/budgeting; repeated entry should be automated; system/subsystem/equipment hierarchy; future updates and source-specific category attributes. |

Speech recognition was performed locally with faster-whisper base.en. Transcripts may contain recognition errors; they were cross-checked against screen-share samples and the written documents. No claim is made that every video frame was manually viewed. Extracted text, complete transcripts and contact sheets remain in the workspace's `.review` folder outside the deployed app. Original documents and recordings were not uploaded as website assets.

## Decisions where sources differ

- **Offline operation:** retained the user's explicit React/Dexie offline-first architecture. The manual describes an older online-only implementation; requirements OFF-01–06 and the October discussion support offline continuity.
- **Serials:** retained the user's explicit Category A requirement. The manual treats missing serials as an allowed export warning, while requirements list ABC serial policy as an open decision. Current app uses the stricter user-requested rule and does not ask for B/C serials.
- **Approval:** added the later requirements' submit → review → return/approve flow; exports are gated by approval and validation. Demo identities remain clearly identified.
- **Technology:** retained the user's explicit React/Vite stack. The documents' Microsoft stack direction is not silently substituted for the authorized stack.
- **Existing work:** additive IndexedDB migrations preserve saved sites, item records, unit records and queued work. Original sample fixtures remain, including their requested categories; reference definitions are separate.
- **Diagrams:** extracted Office/Feed Mill equipment names and clear category suffixes. The files did not expose reliable connector relations through the text extraction, so parent systems were not invented. These definitions are marked `Needs classification`; collections containing them require the system to be confirmed. Ambiguous B/C suffixes were excluded from automatic definition creation.
- **Unknown spreadsheet values:** question marks, `na`, unknown dates, sample addresses and site-specific serials were not treated as real field observations. Template quantities are starting values to check, not evidence of equipment on a new site.

## Changes implemented

- Body and form input text increased to 16px; primary field names are 15px; secondary text is generally 14px. Metadata remains 12–13px where space requires it. Primary actions and inputs are at least 48px high.
- Visible navigation labels for sites, collections, review/exports, catalog, import, and field guide. Mobile navigation opens a labeled menu instead of an icon-only rail.
- First-use guide, plain-language actions, resume banner, search, status filtering, issue counts, and last-saved information.
- Site setup checks duplicate location/building combinations; facility-specific templates distinguish shared, room, and site scopes. Generation is atomic and locked after setup.
- Saved drafts recover after closing/reopening and offline reload. Save & confirm commits equipment/unit changes and a queue entry atomically. Local stale-version checks prevent overwriting a newer saved record when a version is known.
- Natural room ordering, first-unchecked-place resume, place picker, sticky walk controls, expected/not-present/added counts and explicit Undo actions.
- Catalog search includes alternative names; custom entries collect a system and category, inherit the shared install date, remain flagged, and require explicit deletion confirmation.
- Conditional A/B/C unit and serial fields; optional model, capacity, dimensions, warranty and notes; field-focused correction links.
- Site-wide contact, address, organization and business-unit editing; separate imported site-role records.
- Review submission, approval, return comments for a site or selected record, and decision history. Any saved equipment or site edit resets approval.
- Unique persistent export batches, re-download, hierarchy/change preview, subsequent cycles, and retained prior inventory/unit snapshots. Changes are detected by internal IDs and include serial-signature changes.
- CSV/Excel import with previews, row validation, incremental updates, unchanged rows, blank templates, error downloads, transactional save, and upload history. Repeated SITE_ID rows with distinct roles are retained as separate assignments; conflicting site attributes block import.
- Catalog browsing/editing/download, facility templates, site list and custom-item review queue. Existing generated collections are not silently rebuilt when a definition changes.

## Integration and production boundaries

This is a functional offline application and a local workflow preview, not a completed implementation of every enterprise requirement in the draft document.

1. **Oracle FBDI mapping:** the actual Asset Load template referenced by the requirements is not present in this folder. The included `Oracle Equipment Specifications.xlsx` is an equipment workbook, not the FBDI interface schema. The CSV is explicitly labeled a collection handoff file. It is not a validated 122-column Oracle import, and no CREATE/UPDATE/retirement mapping is invented.
2. **Oracle API/reconciliation:** no endpoint, authentication contract or result schema is supplied. Direct submission, official Asset Number reconciliation, and failed-only server retries remain integration work. “Generated” never means “Imported into Oracle.”
3. **Identity and permissions:** corporate Entra ID, server-side role/site authorization and separation of collector/reviewer identities require the organization's backend/tenant configuration. The app labels its combined preview account as a demo.
4. **Sync:** the requested simulated outbox acknowledgement remains. It does not send data to an enterprise backend. Local record-version protection is not a substitute for server conflict reconciliation.
5. **Governance:** approved facility parent mappings, configurable per-unit classification policy, complete template version administration, managed encrypted offline retention, tamper-resistant audit and production assignment controls are not represented as finished integrations.
6. **Cycles:** current local comparisons use persistent internal record IDs until an Oracle identity integration is available. Removed items are marked as such in collection handoff output; no Oracle retirement operation is asserted.

## Verification

Database tests cover preserved v1 data during migration, atomic item/outbox persistence and rollback, category rules, duplicate serials, blank-only dates, duplicate setup, role-aware incremental import, approval gates, unique batches and serial change detection.

Chrome browser tests cover mobile text sizes/navigation and viewport fit, offline editing and draft recovery, date preservation, catalog/custom-item flow, template generation, preview-before-import, approval-gated export and batch history. Screenshots were inspected at desktop and mobile sizes.
