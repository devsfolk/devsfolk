# Task Manifest & Audit Log

> [!IMPORTANT]
> **MANDATORY PROTOCOL:** The AI assistant MUST read this entire file before starting ANY task. 
> All work must be performed on a unique branch. No changes are allowed to the `main` branch without explicit approval after physical testing.

## Mandatory Rules & Restrictions (CODE & DATA)
- **Zero-Touch Policy**: Only modify code directly related to the requested task.
- **Micro-Branching**: One specific issue per branch.
- **Database Separation**: Never point a development branch to the Production Database.
- **Production Lock**: No AI agent is allowed to modify Supabase schema, RLS, or Auth settings on Production without a staging-tested migration plan.
- **Safe Migrations**: Database changes must be documented and approved after staging verification.
- **Environment Integrity**: Never edit, expose, or commit `.env` variables to GitHub.
- **Audit Requirement**: Every change must be documented in the Task Log below.
- **Zero Cleanup**: No "refactoring" or "cleaning" of unrelated code. Keep changes targeted.

---

## Task Log

### [COMPLETED] Task 0: Initial Project Migration & Admin Fix
- **Date**: 2026-05-15
- **Branch**: `main` (Initial setup)
- **Description**: Migrated project to new Supabase instance and fixed admin login issue.
- **Files Modified**: 
  - `.env`: Updated with new Supabase credentials.
  - `scripts/create-admin.cjs`: Created script to register the admin user.
- **Verification**: Admin dashboard is now accessible with provided credentials.

### [COMPLETED] Task 1: Fix Season Sale Image Update Bug
- **Date**: 2026-05-15
- **Branch**: `fix/season-sale-image-logic`
- **Description**: Fixed the issue where the Season Sale banner image wouldn't update from the dashboard. Added a dedicated "Banner Image" field for easier management.
- **Files Modified**: 
  - `src/pages/dashboard/DesignSettings.tsx`: Added `SALE_BANNER` type support and a dedicated image upload/URL field for banners.
- **Verification**: User can now upload or paste a URL for the banner and it correctly updates the storefront.

---

### [COMPLETED] Task 2: Fix Shipping Charges Consistency
- **Date**: 2026-05-17
- **Branch**: `fix/shipping-charges-consistency`
- **Description**: Resolved the issue where shipping was hardcoded as "FREE" in the cart and checkout despite being set differently in the dashboard.
- **Files Modified**: 
  - `src/pages/storefront/CartPage.tsx`: Linked shipping display to `trustFeatures` settings.
  - `src/pages/storefront/CheckoutPage.tsx`: Linked shipping display to `trustFeatures` settings.
  - `src/pages/dashboard/OrdersPage.tsx`: Updated admin order view to reflect the same shipping text.
- **Vercel Sandbox URLs**:
  - Storefront: [https://aurabloom-git-fix-shipping-charges-co-0f204e-devsfolks-projects.vercel.app](https://aurabloom-git-fix-shipping-charges-co-0f204e-devsfolks-projects.vercel.app)
  - Dashboard: [https://aurabloom-git-fix-shipping-charges-co-0f204e-devsfolks-projects.vercel.app/dashboard](https://aurabloom-git-fix-shipping-charges-co-0f204e-devsfolks-projects.vercel.app/dashboard)
- **Verification**: User verified that the Cart, Checkout, and Admin Orders now display the exact text set in "General Settings".

---

### [COMPLETED] Task 3.1: Fix WhatsApp Icon and Redirect
- **Date**: 2026-05-17
- **Branch**: `fix/whatsapp-icon-and-redirect`
- **Description**: Replaced generic icon with a custom WhatsApp SVG and added auto-formatting for phone numbers to redirect to WhatsApp.
- **Files Modified**: 
  - `src/components/icons/WhatsAppIcon.tsx`: Created custom WhatsApp SVG.
  - `src/components/layout/StoreLayout.tsx`: Added formatSocialUrl to auto-convert phone numbers to wa.me links. Used custom icon.
  - `src/pages/dashboard/GeneralSettings.tsx`: Used custom icon in the preview.
- **Verification**: The user verified the real WhatsApp icon appears and clicking it redirects to WhatsApp even if they just typed a phone number.

---

### [COMPLETED] Task 4: Fix WhatsApp Orders Saving & Dashboard Status Updates
- **Date**: 2026-05-17
- **Branch**: `feat/dashboard-orders-whatsapp`
- **Description**: Ensure WhatsApp orders are saved to the dashboard before redirecting, and fix the order status update dropdown in the dashboard. Added WhatsApp verification badges, platform indicators, and an ABANDONED status option.
- **Files Modified**: 
  - `src/context/ShopContext.tsx`: Pre-save order to database with `PENDING_WHATSAPP` / `ABANDONED` status before wa.me redirect, and fix order status update persist logic.
  - `src/pages/dashboard/OrdersPage.tsx`: Add ABANDONED status styling, platform source icons in the order row, and WhatsApp verification badge.
  - `src/pages/storefront/CheckoutPage.tsx`: Trigger order saving when clicking WhatsApp CTA.
  - `src/types.ts`: Define order status enum including `ABANDONED`.
  - `supabase/schema.sql`: Ensure DB supports the statuses and source platforms.
- **Vercel Sandbox URLs**:
  - Storefront: [https://aurabloom-git-feat-dashboard-orders-whatsapp-devsfolks-projects.vercel.app](https://aurabloom-git-feat-dashboard-orders-whatsapp-devsfolks-projects.vercel.app)
  - Dashboard: [https://aurabloom-git-feat-dashboard-orders-whatsapp-devsfolks-projects.vercel.app/dashboard](https://aurabloom-git-feat-dashboard-orders-whatsapp-devsfolks-projects.vercel.app/dashboard)
- **Verification**: User placed a WhatsApp order and saw it in the dashboard. User changed an order status in the dashboard and saw it persist correctly.

---

## Current Active Task
### [COMPLETED] Task 5: Semi-Automatic Bank Transfer Payment System
- **Date**: 2026-05-17
- **Branch**: `feat/semi-automatic-bank-transfer-payment`
- **Description**: Implemented a semi-automatic payment gateway supporting direct bank transfers and digital wallets, using client-side OCR scan technology (Tesseract.js) to scan and verify customer receipt screenshots against order details and totals.
- **Files Modified**: 
  - `src/types.ts`: Extended PaymentGateway interface with bank-specific fields.
  - `src/context/ShopContext.tsx`: Initialized new settings values, updated mergeSettings deep merge logic, and placeOrder status logic.
  - `src/pages/dashboard/GeneralSettings.tsx`: Designed premium, beautifully guided configuration settings for Bank Details and QR Code uploads.
  - `src/pages/storefront/CheckoutPage.tsx`: Designed an interactive Bank Transfer expansion box with copy features, dynamic Tesseract engine loader, canvas compression, laser-scan visualizer, auto-verification result cards, and lightbox preview.
  - `src/pages/dashboard/OrdersPage.tsx`: Updated presentation cards, added shield badging, auto-verified vs manual review labels, lightbox zoomed views, and a one-click manual payment approval action.
- **Vercel Sandbox URLs**:
  - Storefront: [https://aurabloom-git-feat-semi-automatic-bank-transfer-payment-devsfolks-projects.vercel.app](https://aurabloom-git-feat-semi-automatic-bank-transfer-payment-devsfolks-projects.vercel.app)
  - Dashboard: [https://aurabloom-git-feat-semi-automatic-bank-transfer-payment-devsfolks-projects.vercel.app/dashboard](https://aurabloom-git-feat-semi-automatic-bank-transfer-payment-devsfolks-projects.vercel.app/dashboard)
- **Verification**: Verified settings inputs, client-side OCR upload and verification flow, admin table view shield badging, manual review/paid visual labels, details screenshot preview with custom lightbox zoom, and order status updates are all working perfectly.

---

## Current Active Task
*No active task. Waiting for user instruction.*
