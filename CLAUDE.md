# KK System Overview

Last updated: 2026-05-13

## What This Repository Is

This repository is a multi-app KK youth membership ecosystem centered on:

- youth registration and KK profiling
- document-based verification
- digital ID generation
- merchant QR scanning and points earning
- reward redemption
- admin and superadmin operations
- shared notifications and merchant storefront content

The repo currently contains four application codebases:

- `apps/backend`: Express + TypeScript backend using Firebase Admin, Firestore, and Firebase Storage
- `apps/youth-pwa`: Next.js youth-facing web app / PWA
- `apps/admin-panel`: Next.js admin and superadmin dashboard
- `apps/merchant-app`: Expo React Native merchant app

## Working Agreement

- when shipping meaningful implementation or deployment changes, update this `CLAUDE.md` so the repo keeps an in-project record of the current setup and release path

A root `package.json` workspace configuration now exists, so installs and common app scripts can be run from the repo root more easily.

## High-Level System Flow

Based on the current codebase and the `KK-ID-MODULES (3).pdf` reference, the intended end-to-end flow is:

1. A youth user registers and authenticates through Firebase Auth.
2. The youth completes KK profiling.
3. The youth uploads age-based verification documents plus an ID photo.
4. Admin reviews verification requirements and can approve, reject, or request resubmission.
5. Once verified, the youth becomes eligible for a digital ID and QR payload.
6. Approved merchants scan the youth QR and award points based on purchase amount.
7. Youth users use accumulated points to redeem rewards.
8. Admin and superadmin users manage verification, digital IDs, merchants, rewards, points policy, reports, and operations data.

## Repo Structure

### `apps/backend`

The backend is the system integration layer. It verifies Firebase ID tokens, enforces roles, and exposes `/api/*` endpoints for all three client apps.

Main route groups currently wired in:

- `/api/auth`
- `/api/users`
- `/api/profiling`
- `/api/digital-id`
- `/api/physical-id-requests`
- `/api/merchants`
- `/api/rewards`
- `/api/points`
- `/api/qr`
- `/api/admin`
- `/api/notifications`

The backend uses Firestore as the main system of record. Key collections inferred from services:

- `users`
- `kkProfiling`
- `documents`
- `physicalIdRequests`
- `merchants`
- `rewards`
- `points`
- `transactions`
- `notifications`
- `settings`

Merchant-specific data also uses subcollections such as:

- `merchants/{merchantId}/products`
- `merchants/{merchantId}/promotions`
- `merchants/{merchantId}/transactions`

### `apps/youth-pwa`

This is the youth-facing product. It already contains:

- auth pages for login, register, forgot password, reset password, and OTP screen
- onboarding intro flow
- a 9-step section-based profiling flow plus review and success pages
- verification upload and verification status pages
- main app routes for home, merchants, rewards, scanner, digital ID, and profile
- backend-backed notifications page

The youth app uses Firebase client auth plus an Axios API client that attaches the Firebase token to backend requests.

The merchant directory now follows a fixed global storefront UI:

- expandable merchant cards in the merchants list
- a dedicated merchant detail page with hero banner, logo, description, category chips, discount info, points policy, and terms
- storefront data sourced from backend merchant records instead of local mock layout data

### `apps/admin-panel`

This is the operations dashboard for admin and superadmin users. It includes:

- login
- dashboard landing page
- shared dashboard-specific UI primitives for role-based KPI cards, chart cards, activity feeds, and status panels
- shared admin workspace primitives for page intros, stat rows, filter bars, table shells, and detail panels
- verification queue and detailed verification review
- youth records and youth detail management
- merchant management and merchant detail views
- digital ID operations
- rewards management
- points transactions overview
- reports

### `apps/merchant-app`

This is the merchant-facing app built with Expo / React Native. It currently includes:

- merchant login
- dashboard
- live QR scanning
- manual QR/token entry
- transaction history
- shop profile editing
- promotions
- product menu management
- notifications

## PDF Reference vs Current Code

The KK ID modules PDF is useful as a business-flow reference, but the implementation in this repo has already grown beyond it in a few places.

### What Matches the PDF

- youth auth and onboarding exist
- KK profiling exists
- verification document upload exists
- digital ID gating exists
- merchant QR scan / points flow exists
- rewards and redemption exist
- admin verification and merchant approval flows exist

### What Has Expanded Beyond the PDF

- the profiling flow now mirrors the 2026 Google Forms questionnaire in a PWA-friendly sectioned wizard
  - the youth app still uses `step-1` through `step-9`, plus review and success screens
  - those steps are now grouped sections of the 2026 questionnaire rather than the earlier smaller legacy profiling set
- admin tooling is broader than the PDF summary
  - the admin panel includes youth lifecycle controls, points adjustments, conversion-rate updates, digital ID approval states, merchant transaction views, and reward redemption claiming
- merchant tooling is more complete than a simple scan-only module
  - the merchant app also manages products, promotions, profile assets, dashboard stats, and backend-backed notifications

### Business Rules Captured From the PDF

The PDF indicates these core rules, and the repo mostly reflects them:

- verification is required before users can access the full perks/rewards system
- required documents depend on age group
- digital ID should only become available after profiling completion plus successful verification
- merchant purchases can map to points
- rewards consume points

The current backend specifically enforces age-based document requirements and requires an `id_photo` in addition to the residency/school or voter/government ID documents.

The current live points default in code is now:

- `10 points = PHP 100 spent`
- equivalently `PHP 10 = 1 point`

## Current Implementation Status

### Recently completed work

- the youth PWA, backend, and admin panel now support a dedicated Physical Digital ID copy request workflow
  - a new backend module at `apps/backend/src/modules/physical-id-requests/` now owns youth request submission/history plus admin-side request management against the Firestore `physicalIdRequests` collection
  - new youth endpoints under `/api/physical-id-requests` now let verified members with an active Digital ID submit one physical-copy request at a time and review their own request history/status
  - duplicate active requests are now blocked in backend service logic whenever an existing request is still `pending`, `approved`, `processing`, or `ready_for_pickup`
  - each request now stores the member link, Digital ID reference, reason, pick-up contact number, optional notes, admin remarks, rejection reason, handler, and lifecycle timestamps such as `approvedAt`, `processingAt`, `readyForPickupAt`, `completedAt`, and `rejectedAt`
  - youth Digital ID UI at `apps/youth-pwa/src/app/(main)/scanner/digital-id/page.tsx` now includes a `Physical ID Copy` section, a mobile-first themed request modal, active-request blocking/summary states, and a direct link to request history
  - a new youth history page at `apps/youth-pwa/src/app/(main)/profile/physical-id-requests/page.tsx` now shows request date, status badge, remarks, rejection details, ready-for-pickup notice, and a simple per-request status timeline
  - a new admin workspace at `apps/admin-panel/src/app/(dashboard)/physical-id-requests/page.tsx` now gives admin and superadmin a dedicated queue for list/detail review, filters, request-date search, remarks, and lifecycle transitions from `pending` through `completed`
  - the admin lifecycle is now enforced as:
    - `pending -> approved` or `pending -> rejected`
    - `approved -> processing`
    - `processing -> ready_for_pickup`
    - `ready_for_pickup -> completed`
  - the shared notifications system is now reused for this flow:
    - admin/superadmin are notified when a new physical ID request is submitted
    - youth users are notified when the request is submitted, approved, rejected, ready for pick-up, and completed
  - admin dashboard navigation now includes `Physical ID Requests` in the sidebar, topbar metadata, and command-bar search so the module behaves like the rest of the admin workspace
  - the admin Physical ID Requests workspace now treats Barangay Buting as fixed system context and uses `Purok / Zone` instead of `barangay` for request filtering, queue display, and request-detail scanning
  - backend physical ID request records now store `purok` alongside the older barangay context, and the admin queue falls back to each member's current `kkProfiling.purok` value for older request documents that were created before the field existed
  - the admin page layout was also tightened into a more compact master-detail workflow with smaller status metrics, a cleaner queue table, truncated long identifiers, inline copy actions, and reduced top-of-page descriptive clutter
  - verification after rollout: `npm run build` in `apps/backend`, `npm run build:youth`, `npm run build` in `apps/admin-panel`, and `npm run test:backend` all passed locally
- the repo now includes a one-time Firebase cleanup utility for removing pre-live youth test accounts more safely than manual console deletion
  - `apps/backend/utils/cleanupYouthAccounts.js` now scans Firebase Auth, preserves known admin/superadmin emails plus merchant/admin/superadmin roles, and defaults to dry-run mode so the exact deletion candidates can be reviewed first
  - when executed with an explicit confirmation token, the cleanup removes youth-linked Firestore records, Auth users, verification-document storage files, voucher claims, and common user-side ledgers such as `pointsHistory`
  - the cleanup also restores voucher `claimedBy` arrays and stock plus reward stock consumed by deleted test-user redemptions, reducing the risk of carrying test redemption state into live deployment
  - root and backend package scripts now expose the utility through `npm run cleanup:youth`
- the youth PWA, backend, and admin panel now support a drawn Digital ID signature flow with re-sign capability
  - `kkProfiling` records now store `digitalIdSignatureUrl` plus `digitalIdSignatureSignedAt`, and the backend Digital ID + verification-status payloads now expose those fields together with a signature-complete flag
  - the first `Consent & Identity` step of the youth onboarding profiling flow now collects that signature directly through the questionnaire instead of waiting until after profiling
  - the profiling review screen now shows a signature preview, and final profiling submission now uploads the captured signature through the dedicated backend Digital ID signature endpoint after the profile record is saved
  - a new youth page at `apps/youth-pwa/src/app/(main)/profile/signature/page.tsx` lets members draw a signature in a canvas pad, clear and try again before saving, and replace the saved signature later if needed
  - the youth Digital ID page now blocks final ID display until both the emergency contact and member signature are present, then offers an `Update Signature` path for later re-signing
  - the youth `Edit Profile` emergency-contact phone field now normalizes to digits and caps input at 11 characters, and backend profiling saves now apply the same 11-digit limit so the rule is enforced consistently
  - the `Birth & Residence` profiling step now asks for house / block / unit number before street address in both the current and permanent address sections
  - admin Digital ID generation, approval, and regeneration now require a saved member signature in addition to the emergency contact requirement
  - the saved signature now renders on the front of the youth Digital ID card, the admin preview card, and the exported admin PDF
  - the youth PWA Digital ID back card now matches the newer superadmin-style back layout with emergency-contact summary, relationship, terms, valid-thru date, and signatory block instead of the older QR-based back design
  - the youth PWA Digital ID card spacing was then tuned for narrow mobile screens so the signatory block on the back stays fully visible and the member ID text stays centered under the front-card signature line
  - the member ID number on the front card was later simplified again into a single readable line above the photo area, removing the extra badge container so the signature/photo block keeps more vertical space
  - the youth PWA back-card padding was then increased again so the lower signatory stack stays clear of the border line on the mobile Digital ID page
  - the youth Digital ID action button now uses `Save ID` instead of the old browser `Save / Print ID` flow, and it exports a direct PDF download with the front and back card laid out explicitly so members are not sent through the print dialog or a cropped browser print view
  - the youth PDF export now proxies remote Firebase Storage image assets through a same-origin App Router route before rasterizing them, fixing the case where saved PDFs could lose the member photo and e-signature even though the live card still displayed them in-page
  - the youth PDF export front/back layout now captures hidden high-resolution copies of the same `DigitalIdFace` and `DigitalIdBack` components used in the live preview, replacing the older duplicate coordinate-based drawing path so saved PDFs keep the same padding and positioning seen on the Digital ID page
  - the youth Save ID exporter now normalizes same-origin absolute image URLs back to local paths before fetch/inlining, and the image-proxy route now also accepts same-origin absolute asset URLs plus loopback `http://localhost` image requests when the app is running locally
  - the youth Save ID flow was then moved off the browser `foreignObject` DOM-to-canvas capture path and back onto direct `jsPDF` drawing with fetched/proxied image blobs, which avoids the remaining `SecurityError: Tainted canvases may not be exported` failure that could still block Digital ID downloads in the browser
  - admin verification approval no longer makes the youth Digital ID appear immediately in the PWA
  - when a verified member does not already have an active Digital ID, backend verification approval now queues that member for superadmin Digital ID issuance instead of telling the youth user that the ID is already available
  - the youth Digital ID tab, youth QR tab, verification-status messaging, and onboarding copy now treat Digital ID visibility as a separate superadmin issuance step after admin verification instead of a same-step unlock
  - the Digital ID visibility gate is now stricter about legacy or partial records too: a stored `digitalIdStatus: active` no longer counts as displayable unless real Digital ID generation / approval metadata exists behind it, which prevents admin verification plus an old `idNumber` from making the youth card appear prematurely
  - the verification workflow is now split more strictly by role: regular admins can review individual documents and request resubmission, but final submission approval / rejection is now superadmin-only at both the UI and backend-route level
  - the admin verification detail page keeps a separate `Refer to Superadmin` handoff once all required documents are approved, but that referral no longer performs final verification under the hood; it only flags the case for superadmin final review and Digital ID issuance
  - superadmin Digital ID activation now also finalizes the member verification record when needed, so a member referred from admin document review can be fully verified and issued from the superadmin side without leaving the profile in a stale `pending` state
  - that admin-to-superadmin handoff is now stored as a first-class workflow stage instead of just loose wording: `verificationQueueStatus` can now move into a dedicated pending-superadmin Digital ID generation state, with saved admin handoff metadata for who cleared the documents, who referred the case upward, and when each step happened
  - the admin verification queue, admin verification detail page, superadmin Digital IDs workspace, and youth verification-status messaging now all surface that same handoff state more clearly through updated badges, workflow copy, and approval metadata such as `Approved by Admin`, `Referred by Admin`, and their timestamps
  - the superadmin verification/detail experience now treats referred submissions as a distinct issuance step with a dedicated `Generate Digital ID` action, while row/table labels and status copy were retuned so document review, final superadmin review, and Digital ID issuance read as separate responsibilities instead of one blended approval event
  - the verification workflow was then simplified again around a stricter ownership split: admin now owns the full verification decision, and the main admin-side action is a single `Approve Verification and Refer to Superadmin` handoff once required documents are approved
  - that one admin action now marks the member verified immediately, stores `Approved by Admin`, `Approved At`, `Referred by`, and `Referred At`, and notifies superadmin that the member is ready for Digital ID generation
  - the redundant superadmin `Verify Submission` step was removed from the verification workspace, so superadmin now uses the Digital IDs page as the issuance queue and only completes the final `Generate and Issue Digital ID` action there
  - the Digital IDs workspace now accepts a `?member=` deep link from the verification queue/detail page, which makes the admin-to-superadmin handoff feel like one connected flow instead of sending staff into a generic list view
  - the admin Digital IDs workspace now treats pending issuance as a superadmin-only approval/activation step, and superadmin activation can generate the missing member ID details on approval when the record was only waiting for issuance
  - the youth/admin Digital ID back emergency-contact lines now render in proper title-style capitalization instead of forced all-caps, and the youth/admin PDF exporters now rasterize the member photo more reliably before embedding it so saved PDFs keep the photo visible with steadier front-card positioning
  - signature export from the pad now trims excess transparent canvas space around the actual strokes so the signature sits more naturally on the card line
  - verification checks after the rollout: `npx tsc --noEmit -p apps/youth-pwa/tsconfig.json`, `npx tsc --noEmit -p apps/admin-panel/tsconfig.json`, `npm run build:backend`, and `npm run test:backend` all passed
  - verification checks after the latest youth PDF export alignment update: `npx tsc --noEmit -p apps/youth-pwa/tsconfig.json` and `npm run build:youth` both passed locally again; the previously observed youth page-data collection failure for `/icon.png` and `/api/session` is no longer reproducing on this machine
  - `apps/youth-pwa/next.config.js` now sends `next dev` output to `.next-dev` while keeping production builds on `.next`, so running `npm run build:youth` no longer overwrites the asset set used by a live youth `next dev` session and cause localhost pages to go blank with `text/html` MIME errors for `/_next/static/*`
  - the remaining local build blocker in this repo snapshot is still `npm run build:admin`, which may continue to fail on this machine with `spawn EPERM`
- the youth PWA auth pages now show a branded in-progress modal during email and Google login/register flows
  - `apps/youth-pwa/src/app/(auth)/login/page.tsx` and `apps/youth-pwa/src/app/(auth)/register/page.tsx` now open a shared blocking progress modal whenever auth is still running, so users no longer have to guess whether sign-in is stuck or still processing
  - the modal uses a dedicated shared component at `apps/youth-pwa/src/components/ui/AuthProgressModal.tsx` and keeps the auth screens aligned with the same blue-gold KK visual language already used elsewhere in the app
  - auth form inputs and social buttons now stay disabled while the modal is open so duplicate taps do not trigger overlapping sign-in attempts
  - the youth login and register screens now keep only the Google social sign-in option, and that remaining Google CTA is centered as a single deliberate action instead of sitting in the earlier multi-provider icon row
- the youth PWA KK Profiling flow now uses controlled selects for the questionnaire's bounded age/count follow-up fields instead of free text/number inputs where the guide allowed `Not Applicable`
  - `ageFirstEmployed`, `smokingStartAge`, `alcoholStartAge`, `ageAtFirstSexExperience`, `numberOfChildren`, `ageAtFirstPregnancy`, and `ageAtFirstImpregnation` now use dropdowns backed by bounded option lists, while keeping the saved Firestore field keys unchanged in `kkProfiling`
  - age-based dropdowns now use `1` through `35` with `Not Applicable`, and the reproductive-health fields that already documented it also keep `Prefer not to say (Mas gusto kong huwag sabihin)` as a selectable option
  - onboarding draft sanitization and step validation now clear or block stale single-choice values that are no longer valid options, so old free-text answers like unsupported entries cannot silently pass the updated select-based flow
- the repo now ignores Next.js `.next-dev` development-output folders alongside `.next`, matching the separate dev-vs-build `distDir` setup already used by both web apps
  - generated `.next-dev` files for `apps/youth-pwa` and `apps/admin-panel` should no longer be tracked in Git, which prevents local `next dev` cache churn from appearing as fake source changes after normal development work
- the youth/admin Digital ID front-card info column was nudged slightly upward and its internal spacing tightened so the text fields sit in better visual balance with the profile photo area
  - the live youth card, admin preview card, and both exported PDF front layouts now keep the same refined vertical alignment instead of drifting between on-screen and downloaded versions
  - the same front info block was then nudged a little higher again for a tighter photo-to-text balance while keeping the existing card proportions and responsive behavior intact
- the superadmin Digital ID back-card preview now mirrors the youth PWA back-card spacing more closely instead of using the older denser lower-section sizing that made the signatory block feel too close to the inner border
- the admin/superadmin Digital IDs workspace now computes a previewable member ID for queued records even before final issuance has persisted `idNumber`
  - the front-card preview and related admin exports no longer fall back to `DRAFT` for members already in the Digital ID workflow when a deterministic KK ID can be derived safely from the user id
- the Digital ID front card now shows a dedicated `Purok` field below `Home Address`, and the entire front content stack was lifted closer to the upper yellow band so the photo/details block sits higher without changing the core card design
  - the live youth card, superadmin preview, and both PDF/export front layouts were updated together so the extra field and higher alignment stay visually consistent across screens and downloads
  - the youth/admin Digital ID front `Purok` and `Contact No.` fields are now backed by real profile data instead of placeholder blanks
  - the profiling schema now captures optional `Purok / Zone` and `Contact Number` entries and maps them into the legacy `kkProfiling.purok` and `kkProfiling.contactNumber` fields already used by admin, verification, and Digital ID flows
  - the youth `Edit Profile` page now exposes the same front-card fields so already-profiled members can update them without rerunning the full questionnaire, and those saved values immediately feed both the youth Digital ID card and the superadmin preview
  - the Digital ID back-card validity label now reads `Valid Until`, and the expiry date is now computed as 2 years from Digital ID issuance / approval metadata instead of the older longer verification-based validity calculation
- admin verification state reset and review responsiveness are now more consistent across Youth Members and Verification
  - manual status changes back to `pending` through `apps/backend/src/modules/admin/admin.service.ts` now also rewind the member's verification handoff metadata and reset all related `documents` review states back to `pending`, so a member no longer stays visually `verified` in the Verification queue after being moved back to pending in Youth Members
  - verification queue status computation in both `apps/backend/src/modules/admin/admin.service.ts` and `apps/backend/src/modules/digital-id/digitalId.service.ts` now recomputes from the current member status plus live document states instead of blindly trusting stale saved queue labels
  - the admin youth detail payload now exposes each uploaded document's real review status instead of forcing every item to mirror the profile status
  - the admin verification detail page at `apps/admin-panel/src/app/(dashboard)/verification/[userId]/page.tsx` now applies document approve/reject results in-place after the API call succeeds, removes the blocking loading modal for per-document review actions, and updates the queue badge/checklist live without a full screen refresh
  - backend verification for the reset flow now includes a dedicated fake-Firestore integration case in `apps/backend/tests/backend.integration.test.js`
- the admin verification detail workflow is now less brittle around flagged documents and superadmin handoff
  - flagged / rejected documents on `apps/admin-panel/src/app/(dashboard)/verification/[userId]/page.tsx` now automatically count as resubmission targets, so `Request Resubmission` becomes actionable as soon as the admin adds a message instead of depending on a hidden extra checkbox step
  - sending a resubmission request now updates the current verification detail screen in place to `resubmission_requested` without requiring a browser refresh
  - once all required documents are approved, the same verification detail page now surfaces a clear forward action again for the admin: either `Approve Verification and Refer to Superadmin` for pending records or `Refer to Superadmin` for already-verified records that have not been queued yet
  - backend document flagging now also clears stale verification / Digital ID handoff state so the workflow cards no longer keep showing completed issuance states after a required document has been marked with an issue
- backend document review writes are now Firestore-safe for admin verification actions
  - `apps/backend/src/modules/admin/admin.service.ts` now strips `undefined` keys before writing document-review side effects into `kkProfiling`, preventing the `/api/admin/verification/:userId/documents/:documentId/review` endpoint from failing with Firestore `undefined`-value errors when an admin approves a document
  - the same review service now explicitly guards required identifiers and allowed actions before writing, while `apps/backend/src/modules/admin/admin.controller.ts` returns a clearer success payload with the reviewed `userId`, `documentId`, `action`, and `note`
  - the admin verification detail page continues to send a fully defined `{ action, note }` payload and updates the reviewed document status live after success
  - route coverage for that success envelope was added in `apps/backend/tests/backend.routes.test.js`
- the superadmin Merchants workspace now separates merchant directory maintenance from transaction review more clearly
  - the misleading `Applications` tab was removed because merchant accounts in this repo are manually created by superadmin instead of coming through a registration queue
  - `apps/admin-panel/src/app/(dashboard)/merchants/page.tsx` now uses a more balanced two-column card layout with a merchant-selection stack on the left and a purpose-specific detail pane on the right
  - the `Directory` tab now focuses on merchant profile, storefront, and lifecycle management only
  - the `Transactions` tab now owns the merchant transaction history view, including its own merchant summary context plus paginated transaction cards so long activity logs no longer force one long scroll inside the profile pane
  - the merchant-selection cards were then tightened again into a denser dashboard-style row treatment with smaller padding, a reduced logo block, single-line descriptions, and responsive multi-column wrapping on wider screens so the directory no longer feels dominated by oversized cards
- the superadmin Reports workspace now surfaces a more useful profiling-driven analytics mix without overcrowding the page
  - backend report aggregation in `apps/backend/src/modules/admin/admin.service.ts` now includes `byGender`, `byWorkStatus`, and `civicEngagement` in addition to the earlier age / status / education slices
  - monthly registration vs verification reporting is now grouped and sorted by real month-year buckets such as `Mar 2026` instead of collapsing every `Mar` together across different years
  - report aggregation now also includes `byStudyStatus`, `outOfSchoolReasons`, and `learningPathways`, which lets the reports workspace surface in-school vs out-of-school splits, reasons for being out of school, scholarship / vocational / business-interest signals, and other higher-value questionnaire insights without inventing extra datasets
  - reports are now filterable by date range, barangay, age group, gender, and verification status, and the backend returns the matching filter-option lists together with summary/KPI totals for the currently filtered dataset
  - the admin reports page at `apps/admin-panel/src/app/(dashboard)/reports/page.tsx` was then restructured into clearer reporting sections instead of just adding more charts on top of the old layout
  - the top of the page now includes a dedicated report-tools surface with refresh, reset, filter, and PDF-export actions plus a clearer platform activity snapshot for the latest month and verification rate
  - the first reporting row now follows a more dashboard-like structure with 6 KPI cards for total registered youth, verified youth, pending verifications, active merchants, monthly growth, and survey completion rate
  - the middle reporting row now uses a large area-chart trend for registrations vs verifications over time together with a radial verification-progress snapshot and supporting monthly status stats
  - the older verification-status pie and youth-classification chart were removed from the visual layout so the page no longer repeats the same story in slightly different formats
  - the live charts now focus on distinct, non-duplicate reporting questions:
    - monthly registration and verification trend
    - age-group distribution
    - top barangays by registered youth
    - reported gender mix
    - educational background
    - employment status
    - out-of-school youth reasons
    - learning and skills pathways
    - barangay engagement insights
  - the chart palette was also refreshed away from the earlier heavier dark-toned look into a more balanced blue / teal / emerald / amber / coral / rose / violet set that stays more readable in both light and dark mode
  - the Reports page now includes a built-in PDF report generator using `jspdf` plus `jspdf-autotable`
    - clicking the PDF action now opens a report-builder modal first instead of downloading immediately
    - that builder lets superadmin choose the export-specific date range, barangay, age group, gender, and verification-status filters separately from the live dashboard view
    - the same builder also lets superadmin include or exclude individual report sections such as summary cards, executive summary, trend section, age groups, top barangays, gender mix, education, employment, out-of-school reasons, learning pathways, and civic-engagement insights
    - the builder now also includes a report-format selector so superadmin can choose either a visual analytics PDF with charts/graphs or a cleaner plain text / tabular PDF for easier printing and archival documentation
    - exports can now optionally include or omit the detailed answer-breakdown tables, making it easier to produce either a shorter executive report or a more documentation-heavy official PDF
    - generated PDFs still include cleaner official-report formatting suitable for barangay documentation and presentations
    - the visual-analytics PDF layout was then tightened so the monthly trend chart reserves enough vertical space for its bars and month labels before the next section begins, avoiding the overlapping/stacking bug that could show up in generated reports with small datasets
    - the visual-analytics PDF renderer was then upgraded again so the sections no longer reuse the same horizontal-bar treatment all the way through
      - monthly trend now renders as a clearer line-style trend chart
      - age-group analytics now use vertical columns
      - barangay concentration now uses ranked horizontal bars
      - gender mix now uses a donut-style breakdown
      - educational background now uses a lollipop comparison layout
      - employment status now uses a stacked-composition bar
      - out-of-school reasons now use stepped progress lanes
      - learning / livelihood pathways now use clustered bubble comparisons
      - barangay engagement now uses dot-grid comparison rows
    - the PDF spacing and structure were then normalized again so cards, narrative blocks, chart sections, and tables keep more even padding/gaps instead of feeling cramped in some sections and too loose in others
      - the monthly trend section now follows the same full-width chart then table rhythm as the rest of the report instead of the older tighter side-by-side layout
      - narrative height is now calculated from the wrapped content instead of using one fixed box height, reducing awkward whitespace and preventing crowded copy blocks
      - chart-to-table and section-to-section gaps were standardized so the generated PDF feels more consistent as a document rather than a stack of unrelated export fragments
  - backend coverage now includes a fake-Firestore integration case that verifies the new reports payload and month sorting in `apps/backend/tests/backend.integration.test.js`
- backend seed defaults for privileged web accounts now use live-style email addresses instead of `.test`
  - `apps/backend/utils/seedAdmin.js` now defaults to `admin@kkbapp-buting.com`
  - `apps/backend/utils/seedSuperadmin.js` now defaults to `superadmin@kkbapp-buting.com`
  - the hardcoded seeded passwords remain overrideable through env vars, but the default email values are now closer to a real deployment setup
- the youth PWA KK profiling flow now uses the full 2026 Katipunan ng Kabataan profiling questionnaire from the provided Google Forms PDF
  - the old hardcoded 9-page profiling wizard was replaced with a schema-driven section flow under `apps/youth-pwa/src/app/(onboarding)/profiling/`
  - the new form covers consent, core demographics, education, employment, health, reproductive health, vaccines, civic engagement, security, disaster preparedness, urban mobility, and aspirations
  - questionnaire wording, option sets, `Other:` follow-ups, checkbox vs dropdown vs single-choice input types, and the explicit address / in-school skip logic were preserved in the new config
  - the youth app still renders the survey inside the existing profiling shell and review experience, but the route pages now act as thin wrappers over a shared step renderer instead of each page owning its own bespoke form logic
  - a new `profiling-schema.ts` file now drives visible questions, review formatting, resume-path logic, and payload normalization
  - dependent profiling questions now use tighter skip logic instead of relying on "Not Applicable" as the main escape hatch for obviously unrelated branches
  - education, employment, business, disability, smoking, alcohol, children/solo-parent, sex-experience-driven and sex-specific reproductive questions, school/workplace safety, and weekly online-betting spend now hide when their parent answer makes them irrelevant
  - hidden follow-up answers are now automatically stripped from the saved draft and final payload so stale branch data does not survive review/submission after a user changes an earlier answer
  - submission now also derives the legacy profile fields that the current backend, digital ID, and admin surfaces still expect, including `birthday`, `youthAgeGroup`, `educationalBackground`, `youthClassification`, `workStatus`, and the older civic booleans such as `registeredSkVoter` and `attendedKkAssembly`
  - the local draft key was versioned to `profiling-2026` so stale drafts from the earlier reduced profiling form do not collide with the new questionnaire structure
  - the profiling shell now keeps the full page scrollable while the step dots and `Next` button stay fixed at the bottom of the viewport
- the youth PWA and backend now support a dedicated Digital ID emergency-contact flow outside the main KK profiling questionnaire
  - `kkProfiling` records now accept nullable `digitalIdEmergencyContactName`, `digitalIdEmergencyContactRelationship`, and `digitalIdEmergencyContactPhone` fields, and verification-status payloads expose those values plus an `digitalIdEmergencyContactComplete` flag
  - the youth `Edit Profile` page now lets already-profiled members add or update those emergency-contact details without repeating the 2026 profiling questionnaire
  - the youth `Digital ID` page now blocks the final ID view with an `Add Emergency Contact to Complete Your Digital ID` prompt whenever any of the three fields are missing
  - backend digital ID draft generation, approval submission, activation, and regeneration now refuse to proceed until the emergency-contact fields are complete
  - the youth profile page now also surfaces a reminder card when the Digital ID emergency contact is still missing
- the youth PWA Facebook sign-in flow is now more reliable for backend user syncing
  - `apps/youth-pwa/src/services/auth.service.ts` now explicitly requests the Facebook `email` permission before popup sign-in
  - if Facebook does not return an email address, the app now shows a clearer error instead of trying to auto-register an incomplete backend user record
  - Facebook sign-in now starts with `signInWithRedirect` on the youth login and register pages, then completes the Firebase + backend session handoff after the browser returns to the same page
  - a lightweight session-storage handoff preserves the intended post-auth path so mobile browsers and installed PWAs can return users to the correct next screen after Facebook auth
- merchant accounts created by superadmin now carry a temporary-password policy that is enforced in the Expo merchant app
  - account creation now stores a secure hash of the issued temporary password in a dedicated backend `merchantSecurity` record instead of relying on a client-only reminder
  - merchant login now posts the entered password to `/api/auth/login` after Firebase sign-in so the backend can compare it against the stored temporary-password hash and decide whether `mustChangePassword` should stay on
  - the merchant app auth state now persists `mustChangePassword`, and the root navigator blocks access to the merchant workspace until that flag is cleared
  - a new forced password-change screen now reauthenticates the merchant, updates the Firebase password in-app, and notifies the backend to clear the temporary-password requirement for the current account
  - if a merchant later signs in again using the original superadmin-issued password, the backend can detect that and re-enable the forced password-change flow
  - merchant password recovery in the Expo app no longer points merchants to Firebase reset emails, which are a poor fit for superadmin-generated merchant accounts
  - the `Security & support` area in the merchant Account tab now routes to an in-app password-change screen instead of showing a `Send Password Reset Email` action
  - the forced-password-change screen was also tightened so it keeps the update flow fully in-app and now tells merchants to contact the superadmin for a fresh temporary password if they no longer know their current one
  - the merchant login screen now mirrors that same rule: `Need password help?` explains the superadmin-issued temporary-password recovery path instead of attempting email-based Firebase reset
- backend TypeScript build is clean again after the recent merchant-password rollout
  - `apps/backend/src/modules/auth/user.service.ts` now returns a typed user record shape instead of an overly narrow `{ id: string }` inference, which keeps auth/login role handling build-safe
  - `apps/backend/src/modules/vouchers/vouchers.service.ts` now gives the youth voucher list a typed `status` + `claimedByMe` summary shape so the backend build no longer fails on the voucher filter
  - `npm run build:backend` now completes successfully again
- the backend now has an initial no-dependency automated test foundation focused on the highest-risk shared business logic
  - `apps/backend/package.json` now exposes a `test` script, and the repo root now exposes `npm run test:backend`
  - shared pure helper modules were extracted for notifications, merchant storefront normalization, QR/points conversion, and reward status logic so those rules can be tested without booting Firebase
  - `apps/backend/tests/backend.helpers.test.js` now covers notification mapping/sorting, merchant storefront payload shaping, QR token extraction, amount-to-points conversion, merchant status gating for QR awards, reward availability resolution, voucher expiry clamping, and reward redemption status calculation
  - `apps/backend/tests/backend.services.test.js` now extends that baseline into mocked service-level coverage for `notifications.service`, `qr.service`, `merhcants.service`, and `rewards.service`
  - `apps/backend/tests/backend.routes.test.js` now adds route-level contract coverage for `/notifications/me`, `/notifications/me/read-all`, `/qr/redeem`, `/rewards`, `/rewards/:rewardId/redeem`, and `/rewards/my-redemptions`
  - `apps/backend/tests/fake-firestore.js` now provides an in-memory Firestore-style integration harness with collection queries, subcollections, transactions, batches, `serverTimestamp`, and `arrayUnion` support for backend tests
  - `apps/backend/tests/backend.integration.test.js` now validates real stateful write flows for notifications, reward redemption, QR awarding, and merchant storefront updates against that harness
  - `npm run test:backend` now runs helper, mocked service, route-level contract, and stateful integration suites after a fresh backend build
  - a true Firebase Emulator suite plus end-to-end client flow tests still needs to be added later if deeper parity with Firebase runtime behavior is required
- the repo now has a first GitHub Actions CI workflow for backend safety checks
  - `.github/workflows/backend-ci.yml` installs the root workspace on Node `20.19.4`, runs `npm run build:backend`, and then runs `npm run test:backend`
  - this gives the project an automatic backend build-and-test gate on pushes to `main` / `master` and on pull requests
  - `.github/workflows/apps-ci.yml` now adds separate GitHub Actions jobs for `npm run build:admin`, `npm run build:youth`, and `npm run typecheck:merchant`
  - the repo now has automatic backend, web-app, and merchant-typecheck safety checks on pushes to `main` / `master` and on pull requests
  - deployment-specific checks such as real EAS builds, Render/Vercel env validation, and Firebase Emulator parity are still later steps
- superadmin can now create merchant accounts directly from the admin panel
  - a "Create Merchant Account" tab appears in the Merchants page for superadmin only
  - the form collects: business name, category, address, owner name, login email, and password
  - the category field in that create-merchant form now uses a preset dropdown list instead of free-text entry, which makes onboarding more consistent for merchant directory data and reduces category spelling drift
  - "Auto-fill" derives an email slug from the business name; "Generate" creates a cryptographically random 12-character password; the password field has a show/hide toggle
  - on submit, the backend (`POST /api/admin/merchants/create`, superadmin-only) creates a Firebase Auth user, sets the `merchant` role claim, writes the users doc, and creates a Firestore merchant record with `status: approved` (pre-approved since the superadmin is creating it directly)
  - a welcome notification is sent to the new merchant's UID
  - success shows the credentials (email + password) in a copyable card with individual copy buttons and a show/hide toggle for the password; the superadmin is prompted to share these with the merchant
  - the merchant list refreshes automatically after creation
- the admin panel Topbar notification bell is now fully functional for both admin and superadmin roles
  - on mount, fetches `/api/notifications/me` silently to populate the unread badge count
  - clicking the bell opens a dropdown panel and re-fetches the latest notification list
  - the shared bell now only shows an indicator when unread notifications actually exist, using the numeric unread count (capped at "9+") and removing the old fallback dot when everything is already read
  - the dropdown lists each notification with title, body, relative timestamp, and a colored dot per type (success = green, error/warning = red, transaction = blue, default = primary blue)
  - unread notifications are highlighted with a light blue row background; read ones use plain white
  - a "Mark all read" button calls `/api/notifications/me/read-all` and optimistically updates the list in-place
  - clicking outside the dropdown closes it
  - empty state and loading spinner are shown appropriately
  - the existing `/api/notifications/me` endpoint works for any Firebase-authenticated user including admin UIDs, so no backend changes were needed
  - the bell now also polls periodically, refreshes on window focus, and reuses the same refresh path for both admin and superadmin so unread counts and new-notification state stay in sync more reliably during active sessions
  - individual notifications are now clickable, mark themselves read through a dedicated backend route, visually gray out after being opened, and redirect admins to the linked workspace such as `/verification`, `/youth`, `/promotions`, or `/digital-ids`
  - youth account creation and completed verification-document submissions now write admin/superadmin notification records so those events actually show up in the bell for follow-up
- the admin dashboard has been rebuilt around a shared dashboard component system with distinct admin and superadmin views
  - `apps/admin-panel/src/app/(dashboard)/dashboard/page.tsx` now acts as a thin coordinator: it fetches `/api/admin/dashboard`, resolves the role from `localStorage` (`kk-admin-role`), shows loading skeletons, and renders either `AdminDashboardView` or `SuperadminDashboardView`
  - reusable dashboard primitives now live under `apps/admin-panel/src/components/dashboard/`, including page intros, KPI cards, chart cards, status lists, activity feeds, legend grids, and dashboard-specific Recharts wrappers
  - the `admin` dashboard is now intentionally operational: 4 KPI cards, verification lifecycle chart, a "Needs attention" stack, profiling completion, and a tighter activity feed limited to registration, verification, and document events
  - the `superadmin` dashboard now behaves more like a control tower: platform-wide KPI cards, lifecycle overview, attention stack, points snapshot, merchant status snapshot, and a broader recent system activity feed
- the broader admin-panel redesign now extends beyond `/dashboard`
  - shared management-page primitives now live in `apps/admin-panel/src/components/admin/workspace.tsx`
  - `/verification`, `/merchants`, `/promotions`, and `/reports` were refreshed to use the same calmer visual hierarchy: stronger page intros, summary stat rows, cleaner filter bars, better empty states, and more structured detail panels
  - the redesign intentionally keeps dense operational data, but moves most of the visual weight into section framing and page rhythm instead of louder colors or more widgets
- the admin and superadmin UI palette now uses the newer blue-gold system instead of the earlier green-led accent set
  - core admin theme variables in `apps/admin-panel/src/app/globals.css` now center on `#014384`, `#0572DC`, `#FCB315`, `#FCBA2C`, and `#F0F0F0`
  - shared dashboard/workspace primitives and the redesigned `/dashboard`, `/verification`, `/merchants`, `/promotions`, and `/reports` pages were updated so cards, charts, pills, notices, and primary actions follow the new palette consistently
  - the superadmin `Points & Transactions` page now uses calmer summary-card colors that stay inside the same blue-gold brand family instead of the earlier louder blue / yellow / green block treatment, which makes the top KPI cards feel more cohesive with the rest of the admin interface
  - the `Transaction Log` on that same page now paginates the filtered transaction results in-page, so superadmins can move through older records with page controls instead of scrolling through one long table
- superadmin notification delivery for Digital ID referrals is now more reliable and more informative
  - the shared backend notification fan-out helper in `apps/backend/src/modules/notifications/notifications.service.ts` now resolves role recipients from both Firestore user-role documents and Firebase Auth custom claims, which prevents superadmin reminder/referral notifications from silently missing accounts that only had the role in Auth
  - admin referral and reminder actions for Digital ID generation now send richer superadmin notifications with member name/email, approving admin, referring admin, approval time, referral time, and a direct deep link into the Digital IDs workspace for that member
  - the admin-panel Topbar notification bell now refreshes more frequently and renders those Digital ID referral details inline inside the dropdown, so superadmins can see who was approved, who referred the case, and when, without refreshing the page
- admin and superadmin dark mode contrast is now safer on the verification and Digital ID workflows
  - `apps/admin-panel/src/app/globals.css` now exposes theme-aware tone surface and status-pill styles for success, info, warning, and danger states so dark mode no longer reuses washed-out light-mode card backgrounds with low-contrast text
  - the verification queue, verification detail workflow cards, referral callouts, and superadmin Digital IDs summary / issuance callouts now use those shared tone styles instead of hardcoded `bg-*-50` / `text-*-800` combinations
  - this specifically fixes the unreadable light cards seen on the dark-mode verification detail page while keeping the same status language visible for both admin and superadmin roles
  - the same shared admin theme file now also provides contrast-safe action-button variants for outline, primary, neutral, success, and danger actions, and the verification detail page now uses those buttons for document review, resubmission, referral, reminder, Digital ID workspace navigation, and submission rejection so dark-mode disabled states no longer wash out labels like `Send Reminder to Superadmin`
  - the neutral button variant now uses a dedicated navy control color instead of inheriting the theme text token, and the reminder / issuance metadata cards now use the shared info-tone surface, which fixes the case where the dark-mode `Send Reminder to Superadmin` button and its surrounding summary card still looked washed out or nearly the same color as the page
- the shared admin loading modal is now more readable and visually aligned with the blue-gold system
  - `apps/admin-panel/src/components/ui/LoadingModal.tsx` now uses a stronger themed overlay, a polished card background, darker title/body contrast, roomier spacing, and a clearer loading hierarchy instead of the earlier washed-out white modal with barely visible helper text
  - the modal continues to power shared admin and superadmin loading states such as dashboard navigation, member updates, merchant creation, and verification actions, so this polish now carries across those flows without per-page overrides
- the admin-panel Digital IDs screen now uses a more physical-card-inspired back design in both the live preview and exported PDF
  - the back side now follows an off-white bordered layout with centered emergency contact details, terms and conditions copy, validity date, and signatory block inspired by the provided reference card
  - the QR block was removed from the back side entirely so the card reads more like a traditional printed ID back instead of a mixed print-and-tech layout
  - the signatory block now shows a signature-style line above the divider, then `HON. MARK JERVIN B. VENTURA`, then `SK CHAIRPERSON`; the optional third office line stays hidden when not needed
  - emergency contact data on the Digital ID back is no longer hardcoded; the admin preview and exported PDF now read the member's saved Digital ID emergency-contact fields and warn admins when those fields are still incomplete
  - the lower signatory stack spacing was tightened afterward so the printed name and `SK CHAIRPERSON` stay inside the back-card border in both the browser preview and PDF export
  - the superadmin Digital ID back-card content was later shifted upward with roomier bottom padding so the signatory block no longer crowds or touches the lower border in the live preview or exported PDF
  - the front-card member ID number was later simplified again into a single readable line above the photo block in both the browser preview and exported PDF, removing the extra badge container while keeping the number legible
  - the superadmin back-card preview/export spacing was then tightened upward once more so the lower signatory lines stay comfortably inside the border
  - the front-card photo and signature area now leaves more breathing room above the signature line so a future e-signature field can fit more naturally without crowding the photo block
- the admin panel now has explicit Next App Router error boundaries and a safer dashboard stats normalizer
  - `apps/admin-panel/src/app/error.tsx` and `apps/admin-panel/src/app/global-error.tsx` now provide visible recovery UIs instead of falling back to the generic Next dev refresh loop
  - `apps/admin-panel/src/app/(dashboard)/dashboard/page.tsx` now normalizes partial `/api/admin/dashboard` responses before rendering, so missing nested fields no longer crash the dashboard view
- admin panel now enforces role-based access at both the UI and routing levels
  - basic `admin` role sees only Dashboard, Verification, and Youth Members in the sidebar
  - Merchants, Rewards, Points & Transactions, Reports, and Digital IDs are restricted to `superadmin` only
  - the middleware now reads an `admin-role` cookie (set at login alongside `admin-token`) and redirects non-superadmin users away from superadmin-only routes back to `/dashboard`
  - the `admin-role` cookie is cleared on logout alongside the `admin-token` cookie
- the Digital IDs page now adapts buttons to the logged-in role
  - for basic `admin`: the draft status shows "Send to Superadmin" and no-ID members show "Generate Draft ID" (same as before)
  - for `superadmin`: the "Send to Superadmin" step is bypassed — draft members show "Approve & Activate" directly, and no-ID members show "Generate ID" with immediate approve capability
  - this applies to both the inline table action chips and the detail panel buttons
- a backend-backed merchant storefront model is now in place
  - merchant records support storefront copy for `pointsPolicy`
  - youth merchant pages read the shared merchant profile, promo, and product data from the backend
- the youth PWA merchant experience now follows a fixed presentation layer rather than ad hoc merchant-controlled layout
  - merchants provide content
  - the youth app owns the visual template
- merchant editing now supports storefront policy copy in the React Native merchant app
- default points conversion values were updated from `PHP 50 = 1 point` to `PHP 10 = 1 point`
- the merchant scan flow in the React Native app now requires purchase amount entry before awarding points
- youth and merchant notifications are now backed by a shared backend notifications module instead of mock/local-only state
- admin reports now show live backend data only, with explicit loading, empty, and retry/error states instead of seeded fallback analytics
- admin reports now use a local shadcn-style chart layer built around Recharts so future dashboard charts can stay visually consistent
- the legacy backend `/qr/scan` path now delegates to the same amount-based computation used by `/qr/redeem`
- the merchant app dashboard home screen has been visually refreshed around the SK Barangay Buting palette with tighter card sizing, cleaner spacing, and no quick-action block
- the merchant app bottom tabs now use explicit purpose-based icons instead of broken/missing icon placeholders
- the refreshed merchant-app visual system now extends across notifications, scanner, shop profile, account, transactions, products, promotions, login, and scan result screens
- merchant-app form and search screens now use keyboard-safe layouts, and the login screen now supports password visibility toggle
- the merchant dashboard footer area was replaced with a more useful storefront summary panel instead of the earlier generic alignment note
- deployment readiness was improved for the two Next.js apps by generating dedicated `package-lock.json` files inside `apps/admin-panel` and `apps/youth-pwa`
- `apps/admin-panel/next.config.js` now also sends `next dev` output to `.next-dev` while keeping production builds on `.next`, matching the youth PWA setup so running an admin `next build` no longer corrupts a live admin `next dev` session and turn `/_next/static/*` requests into `404` HTML/MIME errors
- the youth PWA home and merchant discovery surfaces no longer rely on sample merchant or promo content and now show backend-driven empty states when live data is unavailable
- the youth PWA home `Partner Shops` strip now uses tighter padding and a balanced logo row so the last merchant logo sits closer to the arrow CTA instead of leaving an oversized gap before `View All Shops`
- a root workspace setup now exists with npm workspaces plus shared root scripts for backend, admin panel, youth PWA, and merchant app tasks
- the youth PWA auth and scanner result routes now wrap `useSearchParams()` usage in `Suspense`-safe client components, and the youth production build completes successfully again
- the youth PWA deployment flow is hardened so `manifest.json` and `sw.js` bypass auth middleware, and the root layout now includes the non-deprecated `mobile-web-app-capable` meta tag alongside the Apple PWA metadata
- the youth PWA profile area is now more reliable on refresh and deep links
  - a root auth bootstrap now mounts on app load so `authStore` is repopulated before `/profile` and `/profile/edit` depend on it
  - this fixes the prior blank/stuck profile screen behavior that could happen when the protected route loaded before the in-memory auth store had been restored
- the youth PWA profile store no longer gets populated from the ambiguous `/api/users/me` payload on the home screen
  - home/profile loading now relies on verification/profile-shaped data instead, which avoids intermittent profile-tab glitches caused by mixing account data and profiling data in one client store
- backend `/api/users/me` now returns an explicit structured payload with `user`, `profile`, and `merged`
  - the old merged-only shape made it too easy for the frontend to confuse account identity data with KK profiling data
- the youth PWA KK profiling flow now uses an app-styled custom dropdown instead of the phone's native select UI
  - shared profiling select fields render an in-app popover/listbox style picker so mobile users see the KK design language instead of the device default picker sheet
  - step 2 gender selection was migrated to the same shared custom dropdown so the profiling experience is visually consistent across the form
- the youth PWA profiling step-2 and step-3 rules were tightened for the member data model
  - age is now treated as a birthday-derived readonly field rather than a manually editable input
  - Philippine mobile input now assumes the `+63` prefix outside the field and accepts exactly 10 local digits, auto-normalizing the first digit to `9`
  - youth age group is now auto-derived from the saved age/birthday and shown as readonly in step 3 instead of asking the user to choose it manually
  - the preferred age-group labels in the youth app are now `Child Youth`, `Core Youth`, and `Adult Youth`
- backend age-group handling is now normalized across verification and admin reporting
  - verification document requirements accept both legacy labels like `Early Youth` / `Late Youth` / `Young Adult` and the newer youth-pwa labels
  - admin age-group summaries and filters now collapse legacy and new labels into the canonical `Child Youth`, `Core Youth`, and `Adult Youth` buckets
- the youth PWA onboarding carousel pager layout is now more stable on short mobile screens
  - the dots now live inside a dedicated media stack below the card instead of floating as a separate block that could visually collide with the artwork
  - the onboarding screen now allows vertical scrolling on shorter viewports so the image, dots, CTAs, and footer do not overlap when height is constrained
- the youth PWA verification upload card now uses the dashed document area as the first interaction point
  - the dashed upload container is now clickable and acts as the trigger to reveal the upload source actions
  - the `Upload from Device` and `Use Camera` buttons stay hidden until the user taps the dashed container, reducing visual clutter and making the upload flow feel more intentional on mobile
- the youth PWA verification upload screen now includes clearer escape routes back into the app
  - a lightweight `Back` action now sits above the upload card
  - a dedicated `Return to Home` button now lets users leave the verification upload flow and explore the app without getting stuck
  - the first-step footer action was also updated from the old scanner-linked `Cancel` behavior to `Return to Home`
- the youth PWA main profile tab was visually refreshed to match the stronger KK website/system language
  - the profile screen now uses the shared blue-to-sky gradient atmosphere, cream/yellow support accents, and rounded card treatment already present in the youth home and digital ID screens
  - profile information, account tools, and logout actions were regrouped into clearer dashboard-style sections so the tab feels like part of the same product family instead of a separate generic settings page
- youth PWA document-upload diagnosis: the verification upload path likely fails when Firebase Storage is unavailable or misconfigured
  - the youth uploader posts full image data as base64 JSON to `/api/digital-id/documents`
  - if storage upload throws `bucket does not exist`, the current backend fallback stores that base64 string in Firestore as `fileUrl`
  - that fallback is unsafe for normal photos because Firestore document size limits are far smaller than a typical base64-encoded mobile image
  - unlike the merchant asset upload flow, the youth document flow currently has no size-bounded inline fallback or alternate bucket-candidate retry logic
- backend fix applied for youth verification uploads
  - the digital-id upload path now retries alternate Firebase bucket candidates (`.appspot.com` and `.firebasestorage.app`) before giving up
  - large base64 document payloads are no longer blindly written into Firestore when storage is unavailable
  - only small inline-safe payloads can use the fallback; otherwise the backend now returns a clear storage-configuration error instead of hitting the Firestore 1 MB document limit
- deployment note: the current Firebase Storage bucket visible in console is `kkprofiling-c42b4.firebasestorage.app`
  - for this project, Render `FIREBASE_STORAGE_BUCKET` and frontend `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` should use the real bucket value from Firebase Console, not the older `.appspot.com` example placeholder
- rejected youth verification submissions now surface a real retry flow
- the merchant Expo app is now hardened for APK distribution
  - production and preview builds now require a real public `EXPO_PUBLIC_API_URL` instead of silently falling back to localhost
  - request auth now refreshes Firebase ID tokens from `auth.currentUser.getIdToken()` before backend calls
  - auth session sync now uses `onIdTokenChanged`, so long-lived merchant APK sessions refresh more reliably instead of depending only on the initial login token
  - merchant storefront profile saves now accept `termsAndConditions` as the same plain text block used by the mobile/admin UIs, instead of being rejected by a backend validator that incorrectly expected an array; the merchant mobile app also now surfaces backend validation detail lines when a save fails
  - the merchant mobile app now submits `termsAndConditions` as newline-split string arrays for compatibility with the still-older hosted backend validator, while the repo backend now accepts either strings or string arrays and normalizes array submissions back into a text block for storage
- merchant APK deployment target is currently the existing Render backend hosted at `https://kk-buting-admin-panel.onrender.com`
  - for the merchant app, the API base URL should be `https://kk-buting-admin-panel.onrender.com/api`
  - despite the Render service name, this is currently being treated as the backend deployment
- merchant app env examples now exist for local, preview, and production
  - `apps/merchant-app/.env.example` for local/dev
  - `apps/merchant-app/.env.preview.example` for preview/internal APK builds
  - `apps/merchant-app/.env.production.example` for production APK builds
- merchant app local Expo startup troubleshooting now also pins a direct `react-refresh` dev dependency in `apps/merchant-app/package.json`
  - the Expo SDK 54 Babel preset can require `react-refresh/babel` from the app-level resolution path during Metro bundling
  - in this workspace snapshot, `react-refresh` was only present under nested package trees, which could make `npx expo start` fail with `Cannot find module 'react-refresh/babel'`
  - keeping `react-refresh` explicit in merchant-app devDependencies makes the Babel dependency path less fragile during local dev
- merchant app local start scripts now default to Expo LAN mode and expose explicit fallback scripts for tunnel / cache-reset startup
  - `apps/merchant-app/package.json` now uses `expo start --lan` for the default start path so Expo Go is less likely to receive a localhost-only QR target that a physical phone cannot reach
  - `npm run start:tunnel --workspace merchant-app` is now the fallback for difficult networks or machines with multiple adapters
  - `npm run start:clear --workspace merchant-app` is now the intentional cache-reset path instead of needing to remember the full Expo CLI flags manually
- the merchant QR scanner now guards same-session duplicate scans more cleanly in the Expo app
  - `apps/merchant-app/src/screens/scanner/ScanScreen.tsx` now uses a ref-based scan lock in addition to React state so one camera read cannot stack repeated scan actions before the UI finishes responding
  - the scanner now remembers the most recently handled QR token for the current scan session and blocks immediate repeat scans of that exact same code unless the merchant intentionally taps `Reset Scanner`
  - duplicate re-scans now show a branded in-app `QR Already Scanned` modal instead of stacking multiple native dismiss dialogs, which keeps the warning aligned with the merchant app theme and makes duplicate-point prevention clearer
- current local troubleshooting setup for `apps/merchant-app/.env` now points directly to `https://kk-buting-admin-panel.onrender.com/api`
  - this is specifically to avoid Expo Go/dev sessions rewriting localhost to a LAN IP like `192.168.x.x:4000`
  - after changing the local `.env`, Expo/Metro must be restarted so the new `EXPO_PUBLIC_API_URL` is picked up

## Merchant APK Release Checklist

Use this checklist when preparing a downloadable merchant build:

1. Confirm the backend Render service is healthy.
   - Open `https://kk-buting-admin-panel.onrender.com/health`
   - Expected result: backend health JSON from the Express app
2. Confirm the backend API base URL to use in mobile builds.
   - Current value: `https://kk-buting-admin-panel.onrender.com/api`
3. Confirm the merchant account was created through the superadmin flow or otherwise has all required backend data.
   - Firebase Auth user exists
   - custom claim `role: merchant` exists
   - `users/{uid}` exists with `role: merchant`
   - a Firestore merchant record exists with `ownerId = uid`
   - merchant status is `approved`
4. Set EAS environment variables for the merchant app.
   - `development` should keep `EXPO_PUBLIC_API_URL=http://localhost:4000/api`
   - `preview` should use `EXPO_PUBLIC_API_URL=https://kk-buting-admin-panel.onrender.com/api`
   - `production` should use `EXPO_PUBLIC_API_URL=https://kk-buting-admin-panel.onrender.com/api`
   - all three environments should also include the public Firebase client values already used by the app
5. Build a preview APK first.
   - `eas build --platform android --profile preview`
6. Install the preview APK on a real device and test on:
   - the same Wi-Fi as development
   - a different Wi-Fi
   - mobile data
7. Validate the core merchant flow.
   - login
   - load dashboard
   - load merchant profile
   - load notifications
   - scan/redeem flow
8. After preview passes, create the production build.
   - `eas build --platform android --profile production`

## Exact EAS Variable Set

The merchant app `eas.json` now maps build profiles to EAS environments:

- `development`
- `preview`
- `production`

Exact values to create in EAS:

### `development`

- `EXPO_PUBLIC_API_URL=http://localhost:4000/api`
- `EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB9kyNcE2xFxfVD4en8pXm6_5XZnT8-hDI`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=kkprofiling-c42b4.firebaseapp.com`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=kkprofiling-c42b4`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=kkprofiling-c42b4.firebasestorage.app`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=227327975687`
- `EXPO_PUBLIC_FIREBASE_APP_ID=1:227327975687:web:a4cdea992aa1844062e5a2`

### `preview`

- `EXPO_PUBLIC_API_URL=https://kk-buting-admin-panel.onrender.com/api`
- `EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB9kyNcE2xFxfVD4en8pXm6_5XZnT8-hDI`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=kkprofiling-c42b4.firebaseapp.com`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=kkprofiling-c42b4`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=kkprofiling-c42b4.firebasestorage.app`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=227327975687`
- `EXPO_PUBLIC_FIREBASE_APP_ID=1:227327975687:web:a4cdea992aa1844062e5a2`

### `production`

- `EXPO_PUBLIC_API_URL=https://kk-buting-admin-panel.onrender.com/api`
- `EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB9kyNcE2xFxfVD4en8pXm6_5XZnT8-hDI`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=kkprofiling-c42b4.firebaseapp.com`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=kkprofiling-c42b4`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=kkprofiling-c42b4.firebasestorage.app`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=227327975687`
- `EXPO_PUBLIC_FIREBASE_APP_ID=1:227327975687:web:a4cdea992aa1844062e5a2`

Recommended EAS CLI commands once logged in:

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value http://localhost:4000/api --environment development --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_URL --value https://kk-buting-admin-panel.onrender.com/api --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_URL --value https://kk-buting-admin-panel.onrender.com/api --environment production --visibility plaintext
```

Repeat the same pattern for each Firebase public variable.

Current blocker observed on this machine:

- `eas` CLI is installed
- Expo account login is not active yet (`eas whoami` returns `Not logged in`)
- EAS env creation cannot be completed until `eas login` succeeds or `EXPO_TOKEN` is provided
- local `next build` verification for `apps/admin-panel` and `apps/youth-pwa` requires stopping the live dev servers on ports `3001` and `3000` first
  - Windows is keeping each app's `.next/trace` file locked while those dev servers are running, so production build checks on this machine fail before app code is evaluated
  - admin rejection now creates a youth notification that links back to `/verification/upload`
  - the youth digital ID page no longer treats `rejected` as "under review" and instead shows the rejection reason/note plus a `Retry Submission` CTA
  - the dedicated verification status screen also shows the rejection feedback and lets the user resubmit immediately

### Backend status: strong foundation, broad feature coverage

The backend is already the most complete part of the system. It has working modules for:

- auth and user lookup
- profiling create/read/update
- verification document upload and status retrieval
- digital ID payload generation
- merchant registration and merchant workspace CRUD
- points earning and redemption
- QR generation and merchant scan validation
- admin dashboards and operational actions
- rewards creation, listing, redemption, and claim tracking
- per-user notifications

Additional backend progress:

- merchant storefront content includes a dedicated `pointsPolicy`
- merchant normalization defaults storefront policy text when none is saved
- admin-facing points conversion fallback values match the current business rule
- a dedicated notifications module exists with authenticated `/api/notifications/me` and `/api/notifications/me/read-all` endpoints
- key lifecycle events now write notifications, including registration, profiling submission, verification decisions, merchant approval and status updates, reward redemption, and reward claim confirmation
- both QR award routes now require amount-based point computation instead of a fixed per-scan award

### Youth app status: mostly implemented core member journey

The youth app already supports the main user lifecycle:

- sign in / register
- complete profiling
- upload verification documents
- view verification status
- view digital ID state
- request and track physical Digital ID copies for pick-up
- view real notifications
- browse merchants
- earn and view points
- browse and redeem rewards
- manage basic profile settings
- browse merchants through a shared storefront card/detail experience

Known incomplete or placeholder areas in the current youth app:

- the PDF mentions splash/onboarding variants that are not fully represented as dedicated production-ready flows in the current repo

### Admin panel status: operationally meaningful

The admin panel is already usable as an operations console for:

- a balanced, role-specific dashboard experience for admin and superadmin users
- a shared workspace-style UI across dashboard, verification, merchants, promotions, and reports
- verification queue review
- per-document review actions
- bulk approval
- youth profile and status management
- physical Digital ID request review and pick-up workflow management
- merchant approval and merchant status changes
- digital ID generation / submission / approval / deactivation / regeneration
- reward creation and redemption claiming
- points transaction oversight
- live reports sourced from backend analytics
- reports rendered through a reusable shadcn-compatible chart wrapper

Known partial area:

- merchant admin editing still focuses on operational fields more than storefront-specific authoring

### Merchant app status: real QR workflow is present

The merchant app is not just UI scaffolding. It already contains:

- authenticated merchant API access
- merchant profile retrieval and update
- live QR scanning with camera support
- manual QR entry fallback
- amount-based point computation
- transaction history retrieval
- promotion CRUD
- product CRUD
- storefront editing for logo, banner, descriptions, discount info, terms, and points policy
- backend-backed notifications with mark-all-read support
- a lighter dashboard UI aligned more closely with the youth PWA visual direction
- purpose-based bottom-tab icons for home, scan, shop, alerts, and account
- a more consistent SK Barangay Buting visual system across the main merchant screens, action pages, and auth/result states
- keyboard-safe text-input layouts across login, scanner, shop, product, promotion, and transaction screens

Known partial area:

- the main merchant surfaces are now visually aligned, but the app still does not yet use shared reusable design primitives for headers, cards, and form sections

## Important Code-Level Observations

- Firebase Auth is the shared authentication layer across clients.
- The backend trusts Firebase ID tokens and derives roles through token claims plus user records.
- Firestore is the operational database.
- Firebase Storage is used for uploaded verification documents and merchant assets, with local/dev fallback behavior when a bucket is unavailable.
- The digital ID flow is stateful and tied to profiling status, uploaded documents, verification result, ID number generation, and QR token revisioning.
- Rewards, points, merchant transactions, and notifications are connected through backend records.

## Notable Gaps and Risks

- Automated coverage is still early-stage.
  - there is now a backend helper + mocked service + route contract + in-memory Firestore integration suite, but there are still no true Firebase Emulator tests or end-to-end client flow tests
- CI coverage is still partial.
  - backend build/test automation plus web-build and merchant-typecheck CI now exist in GitHub Actions, but there are still no real mobile build jobs, deployment smoke checks, or Firebase Emulator jobs
- Some features still use fallback presentation content instead of a fully curated backend-driven implementation.
- The PDF and the codebase are no longer perfectly aligned; the repo reflects a newer and broader product scope than the original module document.

## Practical Snapshot of Current Progress

If we describe the project in plain terms today:

- the core architecture is already established
- the main backend modules exist and are wired
- the youth journey is mostly built
- the admin panel is already a meaningful operations surface
- the merchant app already supports live QR workflows
- the merchant storefront flow is shared end-to-end across backend, merchant app, and youth PWA
- notifications are now backend-driven across youth and merchant experiences
- the youth home and merchant discovery surfaces now avoid sample storefront data and fall back to honest empty states instead
- the youth PWA production build is now clean again after the auth and scanner search-param routes were moved behind `Suspense`-safe wrappers
- the remaining work is mostly about tightening product completeness, removing leftover presentation fallbacks, and adding confidence through testing

## Voucher & Promotions System (completed 2026-04-17)

A full Voucher & Promotions feature was implemented across all four apps.

### New Firestore Collections

- `vouchers` — superadmin-created vouchers with eligibility conditions, points cost, stock, and claim tracking
  - Fields: id, title, description, type, pointsCost, eligibilityConditions (minAge/maxAge/ageGroup/isVerified), stock, claimedBy (array), status, createdBy, createdAt, expiresAt
- `promotions` — merchant-submitted promotions requiring superadmin approval
  - Fields: id, merchantId, title, description, type (points_multiplier/discount/freebie), value, minPurchaseAmount, status (pending/approved/rejected/active/expired), submittedAt, reviewedBy, reviewedAt, reviewNote, expiresAt

### New Backend Routes

- `GET /api/vouchers` — list active vouchers (all authenticated roles); superadmin sees all statuses
- `GET /api/vouchers/:id` — get single voucher
- `POST /api/vouchers` — create voucher (superadmin only)
- `PATCH /api/vouchers/:id` — update/expire voucher (superadmin only)
- `POST /api/vouchers/:id/claim` — claim a voucher (youth only); deducts points if pointsCost > 0, enforces eligibility and stock, prevents duplicate claims
- `GET /api/promotions` — list promotions (role-scoped: superadmin sees all, merchant sees own, youth sees active only)
- `GET /api/promotions/by-merchant/:merchantId` — list active promotions for a specific merchant (used on youth merchant detail page)
- `GET /api/promotions/:id` — get single promotion
- `POST /api/promotions` — merchant creates a promotion (status: pending)
- `PATCH /api/promotions/:id` — merchant edits a pending promotion
- `DELETE /api/promotions/:id` — merchant deletes a pending promotion
- `PATCH /api/promotions/:id/review` — superadmin approves or rejects (sets reviewedBy, reviewedAt, reviewNote)

### Admin Panel Pages Added

- `/vouchers` — Vouchers Management page (superadmin only)
  - Active Vouchers tab: table with Title, Type, Points Cost, Stock, Claimed Count, Status, Expires, Edit/Expire actions
  - Create/Edit form with eligibility condition builder (minAge, maxAge, ageGroup, isVerified)
  - Sidebar entry added (superadmin only)
- `/promotions` — Promotions Review page (superadmin only)
  - Filter tabs: Pending, Approved, Rejected, Expired, All
  - Detail panel with Approve/Reject buttons; reject requires a review note
  - Sidebar entry added (superadmin only)

### Merchant App Changes

- `PromotionsScreen` fully replaced to use the new `/api/promotions` backend instead of the legacy merchantWorkspace local promotion CRUD
- Status badges: Pending (yellow), Approved (green), Active (blue), Rejected (red), Expired (gray)
- Rejected promotions surface the `reviewNote` so merchants understand why
- Edit/delete restricted to `pending` status promotions only
- Create form uses type chips: `points_multiplier`, `discount`, `freebie`

### Youth PWA Changes

- `/vouchers` page added: displays active voucher cards with title, description, points cost (or "Free"), stock, eligibility tag, expiry, and a Claim button
- Claiming deducts points if required and shows success/failure feedback via AlertModal
- Bottom nav updated: Vouchers tab added (ticket icon); nav now has 3 items left of the center scanner, 2 on the right
- Merchant detail page: new "Active Promotions" section fetches approved promotions from `/api/promotions/by-merchant/:merchantId` and renders them below the discount/terms tabs

### Notifications

- Voucher claimed → youth user notified
- Promotion submitted → all admin/superadmin users notified
- Promotion approved/rejected → merchant owner notified

## Voucher Claim Token System (completed 2026-04-18)

A full claim token and QR redemption flow was added on top of the voucher system.

### New Firestore Collection

- `voucherClaims` — one document per youth claim
  - Fields: claimId, uid, voucherId, voucherTitle, token (KKB-XXXXXX format), status (claimed/redeemed/expired), claimedAt, redeemedAt, redeemedBy

### Token Format

- Prefix: `KKB-` followed by 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
- Excludes visually ambiguous characters (0, O, I, 1, L)
- Example: `KKB-A3F9QZ`
- QR code encodes the raw token string directly (no URL wrapping)

### New Backend Endpoints

- `GET /api/vouchers/:id/my-claim` — returns the youth's own claim record including token (youth only)
- `POST /api/vouchers/redeem` — preview step: validates token, returns youth name/email/voucherTitle/claimedAt (admin/superadmin)
- `POST /api/vouchers/redeem/confirm` — marks claim as redeemed, writes youth notification (admin/superadmin)
- `GET /api/vouchers/:id/claims` — all claims for a voucher with youth name/email join (superadmin only)

### Youth PWA Changes

- `/vouchers/[id]` claim detail page: shows QR code (qrcode.react), large monospace token, "Show this to an SK official" helper text, and redeemed state dimming

### Admin Panel Changes

- "Redeem Voucher" tab added to the Vouchers Management page
  - QR scanner using html5-qrcode with camera fallback error state
  - Manual entry field (KKB- prefix locked, 6-char suffix, uppercase enforced)
  - Preview card shows youth name/email, voucher title, claimed date
  - "Confirm & Mark as Given" → calls confirm endpoint → success state with reset
  - Error states for 404 (invalid code), 409 (already redeemed), 410 (expired)
- "Claims" button per voucher row in the table → inline ClaimsPanel below the table
  - Table columns: Youth Name, Email, Token, Claimed At, Status, Redeemed At
  - Status badges: Claimed (yellow), Redeemed (green), Expired (grey)

### Known Gaps

- No admin UI to view which users claimed a specific voucher via the claimedBy array directly (the new Claims panel uses voucherClaims collection instead, which is more accurate)
- Merchant promotion forms use text input for date (`YYYY-MM-DD`) rather than a native date picker (Expo DateTimePicker not yet integrated for this flow)
- The youth vouchers page does not yet show a "My Claimed Vouchers" history view

## Security Hardening (completed 2026-04-30)

The first deployment-security tranche is now in place across the backend, admin panel, and youth PWA.

### Server-Set Web Sessions

- `apps/admin-panel` and `apps/youth-pwa` no longer write auth cookies directly with `document.cookie`
- both web apps now use internal `POST /api/session` and `DELETE /api/session` route handlers to set and clear cookies server-side
- the new cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production
- admin logout, youth logout, and backend `401` handling now clear those cookies through the server route instead of trying to mutate them from the browser
- `apps/admin-panel/src/middleware.ts` now requires both the admin token and admin role cookie, and redirects authenticated admins away from `/login`

### Backend Rate Limiting

- the backend now has a shared in-memory rate limiter at `apps/backend/src/middleware/rateLimit.ts`
- targeted throttling is now applied to:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/password-changed`
  - `POST /api/qr/scan`
  - `POST /api/qr/redeem`
- rate-limit windows and limits are configurable through backend env vars so production can tune them without code changes

### Stricter Runtime Config

- backend env parsing in `apps/backend/src/config/env.ts` now:
  - distinguishes development / test / production behavior
  - requires `QR_SECRET` in production instead of silently falling back to `kk-secret`
  - requires explicit web origins in production through `ADMIN_PANEL_URL`, `YOUTH_PWA_URL`, or `CORS_ALLOWED_ORIGINS`
  - centralizes JSON body-limit and trust-proxy settings
  - exposes auth and QR rate-limit env knobs
- backend CORS now uses an allowlist callback instead of a hardcoded loose array
- the admin and youth web apps now resolve `NEXT_PUBLIC_API_URL` through shared helpers and fail closed in production if that env var is missing

### Verification Notes

- `npm run test:backend` passed after the hardening changes
- `npx tsc --noEmit -p apps/admin-panel/tsconfig.json` passed
- `npx tsc --noEmit -p apps/youth-pwa/tsconfig.json` passed
- `npm run build:youth` passed and now includes the new `app/api/session` route
- `npm run build:admin` is still locally blocked by a locked `apps/admin-panel/.next/trace` file, which suggests an active dev process still has that build cache open on this machine

## Validation & Header Hardening (completed 2026-05-01)

The next security tranche added backend request validation and safer default headers without introducing new runtime dependencies.

### Backend Request Validation

- a shared validation middleware now lives at `apps/backend/src/middleware/validateRequest.ts`
- the backend now rejects malformed JSON payloads before controller/service execution for the highest-risk mutation routes, including:
  - auth login/register/password-changed
  - merchant QR scan/redeem
  - promotions create/update/review
  - vouchers create/update/redeem preview/redeem confirm
  - merchant self-service profile/assets/promotions/products
  - admin merchant creation/status/profile updates
  - admin reward create/update
  - admin verification reject/document review/resubmission/bulk approve
  - admin youth status/profile/archive/points adjustments
  - admin points conversion updates
  - admin digital ID deactivation
- the validators are strict about required fields, enum values, numbers, and string arrays, but intentionally permissive about optional extra fields so the existing clients do not get broken by over-tight schemas

### Security Headers

- the Express backend now disables `X-Powered-By` and applies a shared security-header middleware from `apps/backend/src/middleware/securityHeaders.ts`
- those backend headers now include:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` with camera/geolocation limited to self
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
  - `Cross-Origin-Resource-Policy: same-site`
  - `Origin-Agent-Cluster: ?1`
  - `Strict-Transport-Security` in production
  - `Cache-Control: no-store` on `/api/*`
- both `apps/admin-panel/next.config.js` and `apps/youth-pwa/next.config.js` now disable Next's `poweredByHeader` and apply matching browser-facing security headers
- the youth PWA intentionally keeps `same-origin-allow-popups` so Google/Facebook popup auth continues to work cleanly

### Validation & Header Verification

- `npm run test:backend` passed after adding the validation middleware and route contract checks
- `apps/backend/tests/backend.routes.test.js` now also verifies malformed promotion and admin merchant-account payloads are rejected before controllers run
- `npm run build:youth` still passes after the new Next header configuration
- `npm run build:admin` is still blocked locally by the same locked `.next/trace` file, so the admin build remains a local-process issue rather than a verified code regression

## Favicon Refresh (completed 2026-05-01)

- both `apps/admin-panel` and `apps/youth-pwa` now use the SK Buting logo as their App Router favicon via:
  - `src/app/icon.png`
  - `src/app/apple-icon.png`
- the youth PWA manifest was already pointing at the same logo in `public/images/SKButingLogo.png`, so the installed-app icon and browser favicon are now aligned visually

## What To Do Next

1. Add storefront-specific admin controls if admins should review or override merchant-facing copy such as `pointsPolicy`, banners, and descriptions.
2. Extract reusable merchant-app UI primitives for branded headers, compact cards, and form sections so future screens stay visually consistent with less duplication.
3. Standardize any future admin analytics widgets on the same shadcn chart primitives added for the reports page.
4. Add a true Firebase Emulator test layer when Firebase CLI/tooling is available, then extend toward end-to-end client flow coverage for notifications, points conversion, merchant storefront payloads, QR awarding logic, and reward redemption flows.
5. Add deployment-aware CI later for things like EAS preview builds, Vercel/Render env validation, and smoke checks against hosted environments.
6. Finish deployment polish for the youth PWA by verifying `NEXT_PUBLIC_API_URL` includes `/api` and ensuring Firebase Authorized Domains include the live Vercel hostname.
   - the youth `.env.local.example` file now matches the real Firebase public config and storage bucket instead of older placeholder values
7. Expand the root workspace scripts further if you want one-command flows for more checks, previews, or deployment tasks.
