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
- **Verification**: User should verify that the Cart, Checkout, and Admin Orders now display the exact text set in "General Settings".

---

## Current Active Task

### [IN-PROGRESS] Task 3.1: Fix WhatsApp Icon and Redirect
- **Date**: 2026-05-17
- **Branch**: `fix/whatsapp-icon-and-redirect`
- **Description**: Replaced generic icon with a custom WhatsApp SVG and added auto-formatting for phone numbers to redirect to WhatsApp.
- **Files Modified**: 
  - `src/components/icons/WhatsAppIcon.tsx`: Created custom WhatsApp SVG.
  - `src/components/layout/StoreLayout.tsx`: Added formatSocialUrl to auto-convert phone numbers to wa.me links. Used custom icon.
  - `src/pages/dashboard/GeneralSettings.tsx`: Used custom icon in the preview.
- **Verification**: The user should verify the real WhatsApp icon appears and clicking it redirects to WhatsApp even if they just typed a phone number.
