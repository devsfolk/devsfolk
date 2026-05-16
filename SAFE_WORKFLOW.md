# Safe Development Workflow for Aura Bloom

To ensure the project remains stable and "targeted" while using AI coding assistants, the following rules must be followed for every task.

## 1. Branching Strategy
- **NEVER** work directly on the `main` branch.
- For every new task (improvement, bug fix, or feature), a new branch must be created from `main`.
- Branch naming convention:
  - `feat/feature-name` (for new things)
  - `fix/bug-name` (for fixing issues)
  - `improve/feature-name` (for enhancing existing features)

## 2. Targeted AI Edits
- The AI must only modify files directly related to the task.
- Use **Atomic Edits**: Change specific lines of code instead of rewriting entire files.
- If a change requires touching a shared file (like `ShopContext.tsx`), the AI must explain WHY it is touching it before proceeding.

## 3. Testing & Merging
1. Create branch.
2. Perform task.
3. Verify on Vercel Preview (or local dev).
4. Review the "Diff" (the changes).
5. Merge into `main` ONLY if no other features are affected.

## 4. Emergency Rollback
If a merge causes an unexpected bug in another part of the project:
1. Immediately identify the last stable commit.
2. Run `git reset --hard [commit-id]` on the `main` branch.
3. Delete the problematic feature branch and start over with a narrower focus.
