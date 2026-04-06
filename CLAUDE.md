# KK System Overview

Last updated: 2026-04-06

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
- a 9-step profiling flow plus review and success pages
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

- the profiling flow is more detailed in code than in the PDF
  - the PDF outlines a smaller profiling set
  - the repo currently has `step-1` through `step-9`, plus review and success screens
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
- the youth PWA home and merchant discovery surfaces no longer rely on sample merchant or promo content and now show backend-driven empty states when live data is unavailable
- a root workspace setup now exists with npm workspaces plus shared root scripts for backend, admin panel, youth PWA, and merchant app tasks
- the youth PWA auth and scanner result routes now wrap `useSearchParams()` usage in `Suspense`-safe client components, and the youth production build completes successfully again

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

- verification queue review
- per-document review actions
- bulk approval
- youth profile and status management
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

- There are currently no automated tests in the repository.
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

## What To Do Next

1. Add storefront-specific admin controls if admins should review or override merchant-facing copy such as `pointsPolicy`, banners, and descriptions.
2. Extract reusable merchant-app UI primitives for branded headers, compact cards, and form sections so future screens stay visually consistent with less duplication.
3. Standardize any future admin analytics widgets on the same shadcn chart primitives added for the reports page.
4. Add automated tests for notifications, points conversion, merchant storefront payloads, QR awarding logic, and reward redemption flows.
5. Expand the root workspace scripts further if you want one-command flows for more checks, previews, or deployment tasks.
