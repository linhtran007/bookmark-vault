# E2E Vault Sync - Progress Tracking

**Epic**: E2E Vault Sync
**Breakdown Date**: 2026-01-21
**Status**: In Progress

## Task Progress

| ID | Task | State | Status Notes | Last Updated |
|----|------|-------|--------------|--------------|
| T001 | Fix Plaintext Push Mode Invariants | pending | - | - |
| T002 | Fix Encrypted Push Mode Invariants | pending | - | - |
| T003 | Add Row Auto-Conversion to Plaintext Push | pending | - | - |
| T004 | Add Row Auto-Conversion to Encrypted Push | pending | - | - |
| T005 | Add Encrypted Record Presence Check (Reuse Existing Vault Verify) | pending | - | - |
| T006 | Return Pulled Records from `lib/sync-engine.ts` | pending | - | - |
| T007 | Persist Pulled Ciphertext Using Existing `lib/encrypted-storage.ts` | pending | - | - |
| T008 | Add `decryptAndApplyPulledE2eRecords(vaultKey)` Utility | pending | - | - |
| T009 | Wire E2E Pull Apply into `hooks/useSyncEngineUnified.ts` | pending | - | - |
| T010 | Apply Background-Pulled Data Immediately After Vault Unlock | pending | - | - |
| T011 | Detect Leftover Encrypted Cloud Data in Plaintext Mode | pending | - | - |
| T012 | Add Blocked Sync Dialog (Revert / Delete / Cancel) | pending | - | - |
| T013 | Wire Dialog into Settings/Sync UI + Unified Engine | pending | - | - |
| T014 | Route Handler Tests for Push Invariants + Auto-Conversion | pending | - | - |
| T015 | Route Handler Tests for Pull Mode Filtering | pending | - | - |
| T016 | Client Unit Tests for E2E Pull/Apply Utilities | pending | - | - |

## Completion Summary

- **Total Tasks**: 16
- **Completed**: 0
- **In Progress**: 0
- **Pending**: 16

## Change Log

### 2026-01-21
- Initial breakdown created
- Task list revised to 16 tasks (removed duplicates, aligned with existing code)
- User answers recorded: Backend tests only, Background pull, Prompt user, Auto-convert
- Key constraint reaffirmed: keep two engines (`lib/plaintext-sync-engine.ts` and `lib/sync-engine.ts`)
