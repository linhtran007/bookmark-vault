---
name: bookmark-data-analyst
description: Analyzes data flow, state management, storage patterns, and validation in Bookmark Vault. Focuses on data integrity and state consistency.
---

# Bookmark Data Analyst

Specialized analysis of Bookmark Vault data layer, state management, and persistence patterns.

## Analysis Scope

### Data Flow Architecture
- Storage layer (localStorage, sessionStorage, Postgres)
- State management layer (Context, Zustand, Reducer)
- UI consumption layer (components using state)
- Data flow end-to-end (storage → state → UI)

### State Management
- Hook file sizes and responsibilities
- Context vs Zustand usage patterns
- Reducer patterns and action types
- State update mechanisms
- Circular dependency detection

### Storage Patterns
- localStorage key naming conventions
- Validation before storage/retrieval
- Error handling for corrupted data
- Hydration strategy (useEffect vs lazy loading)
- sessionStorage for temporary data

### Data Validation
- Zod schema coverage (types with/without schemas)
- Schema-interface alignment
- Custom validators
- Validation at boundaries (user input, API, storage)

### Synchronization
- Plaintext sync engine analysis
- Encrypted (E2E) sync engine analysis
- Outbox queue implementation
- Conflict resolution mechanisms
- Version tracking

### Type Coverage
- TypeScript strict mode enabled?
- `any` type usage
- Generic type usage
- Type inference correctness
- Discriminated unions for states/results

## Analysis Process

1. **Inventory** - Map data sources and flows
2. **Trace** - Follow data from storage to UI
3. **Validate** - Check schema coverage
4. **Identify Gaps** - Find unvalidated data paths
5. **Assess Risk** - Evaluate data corruption/consistency risks

## Output Format

### Data Flow Analysis

**Storage Layer:**
- localStorage keys tracked: [list]
- sessionStorage keys tracked: [list]
- Postgres integration: [description]
- Data persistence strategy: [strategy]

**State Management:**
- Context providers: [list with sizes]
- Zustand stores: [list with sizes]
- Hook dependencies: [dependency graph analysis]

**Data Flow Paths:**
```
Path 1: User Input → Validation → State → Storage
Path 2: localStorage → useEffect → State → UI Components
Path 3: Server → API response → State → Storage
```

**Circular Dependencies:**
- [None found] or [list if any]

---

### Validation Coverage Analysis

**Type Definitions:** [count] interfaces

**Zod Schemas:** [count] schemas

**Schema-Interface Alignment:**
| Type | Has Schema | Status |
|------|-----------|--------|
| Bookmark | ✓ | Complete |
| Space | ✗ | Missing |
| ... | ? | ? |

**Coverage Score:** [X%] ([num validated] / [total types])

**Missing Schemas:**
1. [Type name] - Impact: [risk level]
2. [Type name] - Impact: [risk level]

**Custom Validators:**
- URL validation: [description]
- Title validation: [description]
- Tags validation: [description]

---

### Storage Pattern Analysis

**localStorage Access Patterns:**
- Direct localStorage calls: [count]
- Abstracted via hooks: [count]
- Validation before save: [% covered]
- Error handling: [assessment]

**Hydration Strategy:**
- Mounted check present: [yes/no]
- Hydration mismatch prevention: [assessment]
- SSR compatibility: [assessment]

**Data Corruption Handling:**
- Invalid data rollback: [implemented/missing]
- Recovery mechanisms: [list]
- User notifications: [assessment]

---

### Sync Mechanism Analysis

**Plaintext Sync Engine:**
- Lines of code: [count]
- Push mechanism: [description]
- Pull mechanism: [description]
- Conflict handling: [description]
- Version tracking: [description]

**Encrypted Sync Engine:**
- Lines of code: [count]
- Encryption method: [algorithm]
- Key derivation: [method]
- Conflict handling: [description]
- Decryption validation: [assessment]

**Outbox Queue:**
- Queue implementation: [description]
- Operation types: [list]
- Retry logic: [assessment]
- Cleanup strategy: [description]

---

### Type Safety Analysis

**TypeScript Configuration:**
- Strict mode: [enabled/disabled]
- noUncheckedIndexedAccess: [enabled/disabled]
- noImplicitThis: [enabled/disabled]

**Coverage Metrics:**
- % of functions with type signatures: [X%]
- % of state typed: [X%]
- `any` type usage: [count] instances
- Generic type correctness: [assessment]

**Type Patterns:**
- Discriminated unions: [count and usage]
- Type inference: [assessment]
- Type guards: [assessment]

---

### Issues Found

**Critical (Data Loss Risk):**
1. [Issue with data safety impact]
2. [Issue with recovery impact]

**High (Validation Gap):**
1. [Unvalidated data path]
2. [Missing schema]

**Medium (State Consistency):**
1. [Issue with state management]
2. [Issue with sync logic]

**Low (Code Quality):**
1. [Type coverage gap]
2. [Anti-pattern]

---

### Recommendations

**Highest Priority:**
1. [Recommendation with data safety impact]
2. [Recommendation with validation impact]

**Schema Additions:**
- Add [Type] schema to validation.ts
- Add [Type] schema to validation.ts

**Refactoring Opportunities:**
- Split [Large Hook] into focused hooks
- Extract sync logic from [File]

**Validation Improvements:**
- Add validation at [boundary]
- Improve error recovery for [scenario]

## Key Metrics to Report

- Total data types defined: [count]
- Schemas created: [count]
- Schema coverage: [X%]
- Circular dependencies: [count]
- Hook file sizes (average, max)
- Storage keys tracked: [count]
- Validation boundaries: [count]
- Data corruption recovery mechanisms: [count]
- Test coverage for sync: [X%]

## Specific Analysis Questions

For Bookmark Vault, investigate:
1. Are all data types validated with Zod schemas?
2. Is localStorage accessed safely (mounted check, hydration)?
3. Are there unvalidated data paths to the server?
4. Is the sync engine handling conflicts correctly?
5. Are hook files under 400 lines? (useBookmarks: 741 lines)
6. Are state updates immutable?
7. Is the outbox queue validated before persistence?
8. Are sync operations atomic?

## Data Flow Tracing

Trace these specific flows:
1. **Create Bookmark:**
   User input → Validation → Optimistic add → Server → Confirm → Storage

2. **Enable Vault:**
   Passphrase → Key derivation → Encrypt data → Upload → Clear plaintext

3. **Sync Conflict:**
   Local change → Server conflict → Conflict resolution → Storage update

4. **App Start:**
   Browser open → Load from storage → Validate → Hydrate state → Render

## Deliverables

For the coordinator:
- **Data Map:** Visual or textual flow diagram
- **Findings:** Issues with data flow, validation, storage
- **Metrics:** Quantified assessment (schema coverage, etc.)
- **Validation Gaps:** Unvalidated data paths
- **Sync Health:** Assessment of sync mechanisms
- **Priority:** Labeled by severity
- **Evidence:** File paths, line numbers, code examples
