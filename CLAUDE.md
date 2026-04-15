# KK System Overview

Last updated: 2026-04-15

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

- superadmin can now create merchant accounts directly from the admin panel
  - a "Create Merchant Account" tab appears in the Merchants page for superadmin only
  - the form collects: business name, category, address, owner name, login email, and password
  - "Auto-fill" derives an email slug from the business name; "Generate" creates a cryptographically random 12-character password; the password field has a show/hide toggle
  - on submit, the backend (`POST /api/admin/merchants/create`, superadmin-only) creates a Firebase Auth user, sets the `merchant` role claim, writes the users doc, and creates a Firestore merchant record with `status: approved` (pre-approved since the superadmin is creating it directly)
  - a welcome notification is sent to the new merchant's UID
  - success shows the credentials (email + password) in a copyable card with individual copy buttons and a show/hide toggle for the password; the superadmin is prompted to share these with the merchant
  - the merchant list refreshes automatically after creation
- the admin panel Topbar notification bell is now fully functional for both admin and superadmin roles
  - on mount, fetches `/api/notifications/me` silently to populate the unread badge count
  - clicking the bell opens a dropdown panel and re-fetches the latest notification list
  - the badge shows the numeric unread count (capped at "9+") when unread notifications exist, or a plain dot when all are read
  - the dropdown lists each notification with title, body, relative timestamp, and a colored dot per type (success = green, error/warning = red, transaction = blue, default = primary blue)
  - unread notifications are highlighted with a light blue row background; read ones use plain white
  - a "Mark all read" button calls `/api/notifications/me/read-all` and optimistically updates the list in-place
  - clicking outside the dropdown closes it
  - empty state and loading spinner are shown appropriately
  - the existing `/api/notifications/me` endpoint works for any Firebase-authenticated user including admin UIDs, so no backend changes were needed
- the admin dashboard now renders two distinct views based on the logged-in role
  - `admin` view: hero focuses on verification queue and profiling status; shows 4 summary cards (Registered, Verified, Pending, Rejected); no Points Activity or Merchants widgets; quick actions are "Review pending docs" and "View youth members" only; recent activity is filtered to registration, verification, and document events only
  - `superadmin` view: full dashboard unchanged — all 5 summary cards, Points Activity, Merchants, all 3 quick actions, and unfiltered recent activity
  - role is read from `localStorage` (`kk-admin-role`) on mount; the hero banner label also adapts ("Admin Dashboard" vs "Superadmin Dashboard")
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
- the youth PWA home and merchant discovery surfaces no longer rely on sample merchant or promo content and now show backend-driven empty states when live data is unavailable
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
- merchant APK deployment target is currently the existing Render backend hosted at `https://kk-buting-admin-panel.onrender.com`
  - for the merchant app, the API base URL should be `https://kk-buting-admin-panel.onrender.com/api`
  - despite the Render service name, this is currently being treated as the backend deployment
- merchant app env examples now exist for local, preview, and production
  - `apps/merchant-app/.env.example` for local/dev
  - `apps/merchant-app/.env.preview.example` for preview/internal APK builds
  - `apps/merchant-app/.env.production.example` for production APK builds

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
5. Finish deployment polish for the youth PWA by adding a real favicon, verifying `NEXT_PUBLIC_API_URL` includes `/api`, and ensuring Firebase Authorized Domains include the live Vercel hostname.
6. Expand the root workspace scripts further if you want one-command flows for more checks, previews, or deployment tasks.
