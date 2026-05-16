# Task Manifest & Audit Log

> [!IMPORTANT]
> **MANDATORY PROTOCOL:** The AI assistant MUST read this entire file before starting ANY task. 
> All work must be performed on a unique branch. No changes are allowed to the `main` branch without explicit approval after physical testing.

## Mandatory Rules & Restrictions
- **Zero-Touch Policy**: Only modify code directly related to the requested task.
- **Micro-Branching**: One specific issue per branch.
- **No Production DB Mutating**: Never modify the production database directly.
- **Safe Migrations**: Never run destructive migrations.
- **Auth Security**: Never change Supabase policies without approval.
- **Environment Integrity**: Never edit or expose `.env` variables.
- **Audit Requirement**: Every change must be documented in the Task Log below.
- **Small Commits**: Keep commits isolated and focused.

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

## Current Active Task
*No active task. Waiting for user instruction.*
