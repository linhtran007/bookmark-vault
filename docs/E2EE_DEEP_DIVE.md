# End-to-End Encryption (E2EE) Deep Dive

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Current Architecture](#current-architecture)
3. [Cryptographic Primitives](#cryptographic-primitives)
4. [Key Hierarchy & Management](#key-hierarchy--management)
5. [Encryption/Decryption Flows](#encryptiondecryption-flows)
6. [Vault Envelope Structure](#vault-envelope-structure)
7. [Recovery Mechanisms](#recovery-mechanisms)
8. [Security Analysis](#security-analysis)
9. [Attack Vectors & Mitigations](#attack-vectors--mitigations)
10. [Implementation Details](#implementation-details)

---

## Fundamentals

### What is E2EE?

End-to-End Encryption means:
- **Data is encrypted on the client** before transmission
- **Server never sees plaintext** - only ciphertext
- **Only the user** (who has the encryption key) can decrypt

In Bookmark Vault E2EE mode:
- Bookmarks are encrypted before leaving the browser
- Server stores only encrypted blobs
- Server has zero knowledge of bookmark content
- **If server is hacked, bookmarks remain safe**

### Zero-Knowledge Architecture

The server acts as **dumb blob storage**:

```
User → Encrypt locally → Send ciphertext to server
Server → Store encrypted blob → Return encrypted blob
User → Receive blob → Decrypt locally → Read plaintext
```

The server **cannot**:
- Read bookmark titles, URLs, descriptions
- Deduplicate by content (only by metadata)
- Search across bookmarks
- Correlate bookmarks between users
- Generate analytics on bookmark types

---

## Current Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      User                                    │
│                                                              │
│  1. Enter Passphrase                                         │
│     ↓                                                         │
│  2. Passphrase + Salt → PBKDF2 → Wrapping Key               │
│     ↓                                                         │
│  3. Random Generate → Vault Key (Master Key)                │
│     ↓                                                         │
│  4. Vault Key + Wrapping Key → AES-GCM Encrypt              │
│     → Wrapped Vault Key Envelope                            │
│     ↓                                                         │
│  5. Bookmarks + Vault Key → AES-GCM Encrypt                 │
│     → Encrypted Bookmarks (Ciphertext)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  Store locally (localStorage)
                  Store remotely (Server)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Server                                  │
│                                                              │
│  - Stores encrypted wrapper (cannot decrypt)                │
│  - Stores encrypted records (opaque bytes)                  │
│  - Returns encrypted data on request                        │
│  - Last-write-wins conflict resolution                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Role |
|-----------|----------|------|
| **Vault Envelope** | `localStorage` + Server | Contains wrapped vault key + metadata |
| **Vault Key** | `sessionStorage` (unlocked) | Master key that encrypts all bookmarks |
| **Wrapping Key** | In-memory (during unlock) | Derived from passphrase, unwraps vault key |
| **Passphrase** | User's brain | User-memorized secret |
| **Salt** | Vault envelope | Random bytes, prevents rainbow tables |
| **Ciphertext** | Server + `localStorage` | Encrypted bookmark data |

---

## Cryptographic Primitives

### 1. Key Derivation: PBKDF2

**Purpose:** Convert user passphrase (low entropy) → cryptographic key (high entropy)

**Parameters:**
```
Algorithm:   PBKDF2
Hash:        SHA-256
Iterations:  100,000 (as of 2025)
Salt:        16 bytes (128 bits) random
Output:      256 bits (32 bytes)
```

**Why these values?**

- **PBKDF2**: NIST-approved, widely supported, resistant to GPU attacks
- **SHA-256**: Fast hash, no weaknesses known
- **100,000 iterations**:
  - ~100ms on modern CPU (acceptable for unlock)
  - High computational cost deters brute-force
  - Should increase to 150,000-200,000 by 2026 as CPUs get faster
- **16-byte salt**:
  - 2^128 possible salts
  - Unique per envelope = no rainbow tables
  - Prevents pre-computation attacks

**Implementation** (`lib/crypto.ts` lines 7-32):

```typescript
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      hash: 'SHA-256',
      iterations: 100000,
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for wrapping
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}
```

### 2. Symmetric Encryption: AES-256-GCM

**Purpose:** Encrypt bookmark data and vault keys

**Parameters:**
```
Algorithm:   AES-256-GCM
Key Size:    256 bits (32 bytes)
IV Size:     12 bytes (96 bits) - random per encryption
Auth Tag:    16 bytes (128 bits)
Mode:        Galois/Counter Mode (authenticated encryption)
```

**Why AES-GCM?**

- **AES-256**: Military-grade strength, no known weaknesses
- **GCM Mode**:
  - Provides both **confidentiality** (encryption) and **authenticity** (integrity)
  - Detects tampering with ciphertext
  - Prevents various attacks (padding oracle, etc.)
- **12-byte IV**: Recommended by NIST for security + performance
- **16-byte tag**: 2^-128 probability of forgery

**Two Uses:**

1. **Wrapping Vault Key** (key wrapping):
   ```
   Wrapping Key + Random IV → AES-GCM Encrypt → Vault Key
   Result: wrappedKey (base64 stored in envelope)
   ```

2. **Encrypting Bookmarks** (data encryption):
   ```
   Vault Key + Random IV → AES-GCM Encrypt → Bookmark Data
   Result: ciphertext (stored on server)
   ```

**Implementation** (`lib/crypto.ts` lines 45-85):

```typescript
export async function encryptWithAesGcm(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array; tag: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  // In AES-GCM, the output contains: ciphertext + auth tag
  // Last 16 bytes are the authentication tag
  const ciphertext = encrypted.slice(0, encrypted.byteLength - 16)
  const tag = encrypted.slice(encrypted.byteLength - 16)

  return { ciphertext, iv, tag }
}
```

### 3. Random Number Generation

**Purpose:** Generate cryptographic random values (IVs, salts, vault keys)

**Source:** `crypto.getRandomValues()` (Web Crypto API)

- Uses OS-level entropy source (e.g., `/dev/urandom` on Unix, `CryptGenRandom` on Windows)
- Cryptographically secure (not predictable)
- Required for security-critical values

**Values Generated:**
- Vault key: 32 bytes (256 bits)
- Salt: 16 bytes (128 bits)
- IV per encryption: 12 bytes (96 bits)
- Recovery codes: 12 bytes per code (96 bits) → formatted as xxxx-xxxx-xxxx-xxxx

---

## Key Hierarchy & Management

### The Two-Tier Key Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                    TIER 1: VAULT KEY (Master)               │
│                                                              │
│  • Randomly generated (NOT derived from passphrase)         │
│  • 256-bit AES-GCM key                                      │
│  • NEVER transmitted to server                             │
│  • Encrypts ALL bookmark data                              │
│  • Long-lived (persists across sessions)                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↑
                   (wrapped by multiple)
                            ↑
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    TIER 2a: Passphrase  TIER 2b: Recovery   TIER 2c: Future
    Wrapping Key          Code Wrappers        Wrappers
    (exists now)          (proposed)           (e.g., WebAuthn)
        │                   │                   │
    • Derived from      • Derived from      • Other unlock
      passphrase +        recovery code +     methods
      salt via PBKDF2     salt via PBKDF2   • Same vault key
    • Wraps vault key   • Wraps same       • Independent of
    • Unlocks when        vault key          passphrase
      user enters       • Unlocks when
      passphrase          user has code
```

### Why This Design?

**Alternative 1: Derive Vault Key from Passphrase**
```
Passphrase → Derive → Vault Key
Problem: Cannot add recovery codes (different passphrase = different key)
Problem: Cannot change passphrase without re-encrypting all data
```

**Alternative 2: Current Approach (Key Wrapping)**
```
Passphrase → Derive Wrapping Key #1
Recovery Code → Derive Wrapping Key #2
                            ↓
              Both wrap SAME Vault Key
Benefit: Same vault key for all unlock methods
Benefit: Add/remove unlock methods without touching encrypted data
Benefit: Can change passphrase without re-encrypting bookmarks
```

**Why Bookmark Vault Uses Approach 2:**
- Most flexible for recovery mechanisms
- Industry standard (used by Signal, WhatsApp, etc.)
- Enables future multi-factor unlock options

---

## Encryption/Decryption Flows

### Flow 1: Vault Enable (User Creates Vault)

**Trigger:** User clicks "Enable E2EE" and enters passphrase

**Steps:**

```
1. Generate Random Vault Key
   vault_key = AES-256-GCM key (cryptographically random)

2. Generate Random Salt
   salt = 16 random bytes

3. Derive Wrapping Key from Passphrase
   wrapping_key = PBKDF2(passphrase, salt, 100k iterations)

4. Wrap Vault Key
   wrapped_key = AES-GCM-Encrypt(vault_key, wrapping_key)

5. Create Vault Envelope
   envelope = {
     wrappedKey: base64(wrapped_key),
     salt: base64(salt),
     kdfParams: { algorithm: 'PBKDF2', ... }
   }

6. Encrypt Local Bookmarks
   FOR EACH bookmark:
     encrypted = AES-GCM-Encrypt(bookmark_json, vault_key)
     store encrypted in localStorage

7. Store Envelope Locally
   localStorage['vault-envelope-{userId}'] = envelope

8. Store Vault Key in Session (unlocked state)
   sessionStorage['vault-key-{userId}'] = vault_key
   (cleared when browser closes)

9. Push to Server
   POST /api/vault/enable
   Body: { vaultEnvelope, encryptedBookmarks }
   Server stores both (cannot decrypt)

10. Generate and Display Recovery Codes (new)
    FOR i=1 TO 8:
      recovery_code = generate random 12 bytes
      recovery_salt = 16 random bytes
      recovery_wrapping_key = PBKDF2(recovery_code, recovery_salt)
      recovery_wrapped_key = AES-GCM-Encrypt(vault_key, recovery_wrapping_key)
      store in envelope.recoveryWrappers[]

    Display codes to user (print/download)
```

**State After Enable:**
- `localStorage`: Vault envelope + encrypted bookmarks
- `sessionStorage`: Unwrapped vault key (temporary)
- `Server`: Encrypted envelope + encrypted bookmarks (opaque)
- `Memory`: Passphrase (briefly, for derivation)

---

### Flow 2: Vault Unlock (User Enters Passphrase)

**Trigger:** Browser starts or user returns after session close

**Steps:**

```
1. Load Vault Envelope
   envelope = localStorage['vault-envelope-{userId}']

2. User Enters Passphrase
   passphrase = await getUserInput("Enter passphrase")

3. Derive Wrapping Key
   wrapping_key = PBKDF2(passphrase, envelope.salt, 100k iterations)

4. Unwrap Vault Key
   vault_key = AES-GCM-Decrypt(envelope.wrappedKey, wrapping_key)
   (If decryption fails → passphrase wrong → error)

5. Store Vault Key in Session
   sessionStorage['vault-key-{userId}'] = vault_key

6. Verify (optional)
   Decrypt a test record to ensure passphrase is correct
   (catches PBKDF2 errors, verifies auth tag)

7. Load and Decrypt Bookmarks
   FOR EACH encrypted bookmark in localStorage:
     bookmark = AES-GCM-Decrypt(ciphertext, vault_key)

   Store in React context (in-memory)

8. Sync with Server
   GET /api/sync/pull → get server encrypted bookmarks
   Decrypt using vault_key
   Merge with local (conflict resolution)
```

**State After Unlock:**
- `localStorage`: Encrypted bookmarks + vault envelope
- `sessionStorage`: Vault key (valid until session closes)
- `Memory`: Vault key (in-memory React context)

**Security: Session Storage Expires**
- Closing browser tab = sessionStorage cleared = vault_key lost
- Requires re-entering passphrase to unlock again
- Prevents accidental key leakage if user walks away

---

### Flow 3: Encrypt New Bookmark

**Trigger:** User clicks "Add Bookmark"

**Steps (Simplified):**

```
1. User Fills Form
   title, url, description, tags

2. Validate Input

3. Get Vault Key from Session
   vault_key = sessionStorage['vault-key-{userId}']
   (if missing → vault is locked → error)

4. Serialize Bookmark
   bookmark_json = JSON.stringify({
     id: uuid(),
     title, url, description, tags,
     createdAt: now(),
     updatedAt: now()
   })

5. Encrypt
   encrypted = AES-GCM-Encrypt(bookmark_json, vault_key)

6. Store Locally
   localStorage[`bookmark-${id}`] = encrypted

7. Queue for Sync
   outbox.push({
     operation: 'create',
     encryptedData: encrypted,
     timestamp: now()
   })

8. Sync to Server (when connected)
   POST /api/sync/push
   Body: { outboxItems: [...encrypted items...] }
   Server stores ciphertext (cannot read)
```

**Key Point:** Passphrase/vault_key never leaves browser

---

### Flow 4: Decrypt & Display Bookmarks

**Steps:**

```
1. Load Encrypted Bookmarks
   encrypted_data = localStorage[`bookmark-${id}`]

2. Get Vault Key
   vault_key = sessionStorage['vault-key-{userId}']
   OR from server if syncing

3. Decrypt
   bookmark_json = AES-GCM-Decrypt(encrypted_data, vault_key)
   (Auth tag verified → detect tampering)

4. Parse
   bookmark = JSON.parse(bookmark_json)

5. Render
   Display in UI (now plaintext in browser memory)
```

**Important:** Decrypted bookmarks are in browser memory. Browser security then protects from:
- Malicious scripts (CSP, sandboxing)
- Malicious extensions
- Network eavesdropping (HTTPS)

---

## Vault Envelope Structure

### Current Envelope (v1)

**Location:** `localStorage['vault-envelope-{userId}']` and `Server`

**Structure:**

```typescript
interface KdfParams {
  algorithm: 'PBKDF2' | 'Argon2d'
  hash?: 'SHA-256' | 'SHA-512'
  iterations: number
  memoryCost?: number  // For Argon2
}

interface VaultKeyEnvelope {
  wrappedKey: string;      // base64(AES-GCM-Encrypt(vault_key, wrapping_key))
  salt: string;            // base64(16 random bytes)
  kdfParams: KdfParams;    // Derivation parameters
  version: number;         // Currently 1
}
```

**Example (Pretty Printed):**

```json
{
  "wrappedKey": "nHVHx7k4Z+j9QmL2sFt8x4K3VqP5nYc7jM9rD4tG8vE=",
  "salt": "aBcDeFgHiJkLmNoPqRsT",
  "kdfParams": {
    "algorithm": "PBKDF2",
    "hash": "SHA-256",
    "iterations": 100000
  },
  "version": 1
}
```

**Serialization:**

```typescript
// To store:
const envelopeJson = JSON.stringify(envelope)
localStorage['vault-envelope-userId'] = envelopeJson

// To load:
const envelope = JSON.parse(localStorage['vault-envelope-userId'])
```

**Size Analysis:**
- wrappedKey (base64): ~44 bytes (32 bytes raw → 44 base64)
- salt (base64): ~24 bytes (16 bytes raw → 24 base64)
- kdfParams: ~80 bytes (JSON)
- version: ~5 bytes
- **Total: ~150 bytes**

---

### Extended Envelope (v2) - With Recovery Codes

**Proposed structure for recovery code support:**

```typescript
interface RecoveryCodeWrapper {
  id: string;              // UUID unique to this wrapper
  wrappedKey: string;      // base64(AES-GCM-Encrypt(vault_key, recovery_wrapping_key))
  salt: string;            // base64(unique 16 random bytes)
  codeHash: string;        // base64(SHA-256-Hash(recovery_code))
  usedAt: string | null;   // ISO timestamp or null
}

interface VaultKeyEnvelopeV2 {
  wrappedKey: string;      // Passphrase-wrapped key (v1 style)
  salt: string;
  kdfParams: KdfParams;

  // NEW: Recovery codes
  recoveryWrappers: RecoveryCodeWrapper[];

  version: number;         // Now 2
}
```

**Size Analysis with 8 Recovery Codes:**
- Each recovery wrapper: ~120 bytes
- 8 wrappers: ~960 bytes
- Total envelope: ~1.1 KB
- Still well within localStorage (5-10MB typical limit)

**Why Store codeHash, Not Recovery Code?**
- Recovery codes are sensitive (like passphrases)
- Server/localStorage should not store plaintext
- codeHash allows lookup without storing codes
- During unlock: hash user-entered code → find matching wrapper

---

## Recovery Mechanisms

### Current: Passphrase-Only Recovery

**Problem:** User forgets passphrase → **vault is inaccessible forever**

**Why?**
- Vault key is wrapped with passphrase-derived key
- No passphrase = no wrapping key = cannot unwrap vault key
- No server-side recovery (server has no keys)
- No backups (user never sees vault key)

---

### Proposed: Recovery Codes

**Unlock Path #1: Correct Passphrase**
```
User enters passphrase → Derive wrapping key → Unwrap vault key ✓
```

**Unlock Path #2: Recovery Code (Passphrase Forgotten)**
```
User enters recovery code → Derive wrapping key → Unwrap vault key ✓
```

**After Recovery Code Unlock:**
```
Force user to set NEW passphrase:
1. User enters recovery code → unlocks vault
2. Derive new wrapping key from new passphrase
3. Re-wrap vault key with new wrapping key
4. Update primary wrapper in envelope
5. Mark recovery code as used (usedAt = now)
6. Continue unlocking
```

**Recovery Code Properties:**
- **One-time use:** After use, marked as spent
- **Can still access vault:** Just need new passphrase
- **Remaining codes valid:** Other 7 codes still work
- **Can regenerate:** Enter passphrase → generate new 8 codes

---

### Implementation: Recovery Code Unlock Flow

```
1. User clicks "Forgot Passphrase?"

2. Show Recovery Code Input
   "Enter one of your recovery codes"
   Input field accepts: xxxx-xxxx-xxxx-xxxx format

3. User Enters Code
   recovery_code = "a3f9-k2m7-p8q1-z4x6"

4. Hash Code
   code_hash = SHA-256(recovery_code)

5. Find Matching Wrapper
   matching_wrapper = recoveryWrappers.find(w => w.codeHash === code_hash)
   if not found → recovery code invalid → error

6. Unwrap Vault Key
   wrapping_key = PBKDF2(recovery_code, matching_wrapper.salt)
   vault_key = AES-GCM-Decrypt(matching_wrapper.wrappedKey, wrapping_key)

7. Store Vault Key (temporary)
   sessionStorage['vault-key-{userId}'] = vault_key

8. Show "Set New Passphrase" Modal
   "Your recovery code has been used once. Set a new passphrase."

9. User Enters New Passphrase
   new_passphrase = await getUserInput("New passphrase")

10. Update Envelope
    new_salt = 16 random bytes
    new_wrapping_key = PBKDF2(new_passphrase, new_salt)
    new_wrapped_key = AES-GCM-Encrypt(vault_key, new_wrapping_key)

    envelope.wrappedKey = base64(new_wrapped_key)
    envelope.salt = base64(new_salt)

    Mark recovery code as used:
    envelope.recoveryWrappers[i].usedAt = now()

11. Save Updated Envelope
    localStorage['vault-envelope-{userId}'] = envelope
    POST /api/vault/envelope → update server

12. Continue Unlocking Normally
    vault_key is in sessionStorage
    Decrypt bookmarks
```

---

### Regenerate Recovery Codes

**Scenario:** User lost physical copy of codes, or wants fresh codes

**Flow:**

```
1. User in Settings → "Recovery Codes" section

2. Show: "5 of 8 recovery codes remaining"

3. User Clicks: "Generate New Codes"

4. Show Modal: "Enter passphrase to generate new recovery codes"
   (security check: ensure user has access)

5. User Enters Passphrase
   passphrase = await getUserInput()

6. Verify Passphrase
   wrapping_key = PBKDF2(passphrase, envelope.salt)
   vault_key = AES-GCM-Decrypt(envelope.wrappedKey, wrapping_key)
   (if decryption fails → passphrase wrong → error)

7. Generate New Recovery Codes
   FOR i=1 TO 8:
     recovery_code = generate random 12 bytes → format as xxxx-xxxx-xxxx-xxxx
     recovery_salt = 16 random bytes
     recovery_wrapping_key = PBKDF2(recovery_code, recovery_salt)
     recovery_wrapped_key = AES-GCM-Encrypt(vault_key, recovery_wrapping_key)

     recoveryWrappers[i] = {
       id: uuid(),
       wrappedKey: base64(recovery_wrapped_key),
       salt: base64(recovery_salt),
       codeHash: base64(SHA-256(recovery_code)),
       usedAt: null
     }

8. Update Envelope
   envelope.recoveryWrappers = new_wrappers

9. Save Locally & to Server
   localStorage['vault-envelope-{userId}'] = envelope
   POST /api/vault/envelope → update server

10. Display New Codes
    "Save these codes in a secure location"
    Show 8 codes with download/print options

11. Confirm Codes Saved
    Require user to check "I saved my recovery codes"
    before dismissing modal
```

---

## Security Analysis

### Threat Model

| Attacker | Goal | Risk |
|----------|------|------|
| **Network Eavesdropper** | Intercept plaintext bookmarks | Mitigated by HTTPS |
| **Server Admin** | Read bookmarks | Blocked by E2EE (server sees only ciphertext) |
| **Malicious Server** | Forge or modify ciphertext | Blocked by AES-GCM auth tags + integrity checks |
| **Weak Passphrase** | Brute force → derive key → decrypt | Mitigated by PBKDF2 (100k iterations) |
| **Compromised Browser** | Steal vault key from sessionStorage | SessionStorage cleared on close; limited window |
| **Malicious JS** | Read passphrase as user types | Mitigated by input element security (OS-level) |
| **Social Engineering** | Trick user into revealing codes | User education required |

### Strengths

✅ **Server Cannot Read Data**
- Even if server is breached, bookmarks are safe
- Vault envelope and ciphertext are useless without passphrase
- True zero-knowledge architecture

✅ **PBKDF2 Provides Work Factor**
- 100,000 iterations = ~100ms per attempt
- Brute force of weak passphrase (6 chars) still takes hours
- As CPUs improve, iteration count increases

✅ **AES-256-GCM is Mathematically Strong**
- No known practical attacks
- 256-bit key = 2^256 combinations
- GCM auth tags detect tampering

✅ **Random Vault Key**
- Not derived from passphrase
- Users cannot accidentally use weak passphrases for vault key
- Independent of passphrase security

✅ **Recovery Codes Provide Escape Hatch**
- User forgot passphrase ≠ lost vault forever
- Codes are cryptographically equivalent to passphrase
- Can be one-time use for additional security

### Weaknesses & Limitations

⚠️ **Passphrase Strength Matters**
- 4-character passphrase: ~256,000 PBKDF2 iterations to try = hours on GPU cluster
- 8-character passphrase: ~1.7 trillion iterations = impractical
- UI should enforce minimum length (12+ characters recommended)
- User education critical

⚠️ **Recovery Codes Must Be Stored Securely**
- Codes are as powerful as passphrase
- If user stores in plain text file → attacker with file access can unlock vault
- User must treat codes like passwords (print + store safely, or password manager)

⚠️ **Session Storage Can Be Accessed**
- If browser is compromised (malware), sessionStorage can be read
- Vault key is in sessionStorage while unlocked
- Mitigation: Close browser when away; lock desktop

⚠️ **No Defense Against Keylogger**
- Malware on user's computer can capture passphrase as typed
- No technical solution (keyloggers bypass all software security)
- Mitigation: antivirus, don't visit untrusted sites

⚠️ **No Offline Verification**
- User cannot verify recovery codes are correct until they use them
- Could lose all 8 codes if generation was corrupted
- Mitigation: display codes with checksum? (adds UX friction)

---

## Attack Vectors & Mitigations

### Attack 1: Brute Force Passphrase

**Attack:** Attacker has vault envelope. Tries many passphrases.

```
FOR each passphrase in dictionary:
  wrapping_key = PBKDF2(passphrase, stored_salt)
  TRY AES-GCM-Decrypt(wrappedKey, wrapping_key)
  IF decrypt succeeds (auth tag valid):
    → Found passphrase!
```

**Why It's Hard:**
- PBKDF2 with 100,000 iterations: ~100ms per attempt
- Trying 1 million passphrases = 27 hours on single CPU
- With GPU: ~1 hour for 1 million passphrases
- Strong passphrase (12+ chars): dictionary < 1 million possibilities

**Mitigation:**
- ✅ Require 12+ character passphrase (UI enforcement)
- ✅ Use passphrase (e.g., "correct horse battery staple") not password
- ✅ Increase PBKDF2 iterations to 150,000+ (still ~150ms acceptable)
- ❌ Cannot prevent brute force (no server-side rate limiting in E2EE)

**Note:** Users MUST choose strong passphrases. This is non-negotiable for E2EE.

---

### Attack 2: Stolen Recovery Codes

**Attack:** Attacker finds user's printed recovery codes.

```
Attacker enters recovery code → derives wrapping key → unwraps vault key
→ Can decrypt vault → Can view bookmarks
```

**Why It's Possible:**
- Recovery codes are cryptographically valid
- Unlike passwords, codes cannot change (only regenerate all)
- One code grants full vault access

**Mitigation:**
- ✅ One-time use recovery codes (after use, code is marked spent)
- ✅ Force passphrase change after recovery code use
- ✅ User must store codes securely (safe, password manager)
- ✅ Regenerate codes if they might be compromised
- ❌ No technical way to prevent if codes are physically compromised

**Best Practice:** Treat recovery codes as critically as passphrases.

---

### Attack 3: Replay Attack (Outdated Ciphertext)

**Attack:** Attacker captures old encrypted bookmark and replays it.

```
Attacker intercepts: { operation: 'update', bookmarkId: 123, ciphertext: C1 }
Later, replays same message to server
```

**Why It's Not a Threat:**
- Sync engine uses checksums
- Last-write-wins: latest version overwrites older
- Timestamp-based conflict resolution
- Even if replayed, user sees what they last saved

**Mitigation:**
- ✅ Checksum validation (already implemented)
- ✅ Timestamp tracking
- ✅ Version vectors (future enhancement)

---

### Attack 4: Man-in-the-Middle (Network)

**Attack:** Intercept unencrypted HTTP traffic, read bookmarks.

```
User ↔ Attacker ↔ Server
Attacker reads plaintext bookmarks in HTTP body
```

**Why It's Not a Threat:**
- All traffic is HTTPS with certificate pinning
- Ciphertext only over network (bookmarks encrypted locally)
- E2EE happens before transmission

**Mitigation:**
- ✅ HTTPS enforced
- ✅ Strict-Transport-Security headers
- ✅ Data encrypted before leaving browser

---

### Attack 5: Malicious Browser Extension

**Attack:** Extension reads plaintext bookmarks from browser memory.

```
Extension can:
- Read localStorage (encrypted items)
- Read sessionStorage (vault key while unlocked)
- Access DOM (decrypted bookmarks in state)
- Hook crypto APIs
```

**Why It's a Real Risk:**
- Browser security model: extensions have broad access
- Decrypted bookmarks exist in browser memory
- No amount of server-side encryption helps

**Mitigation:**
- ⚠️ Only install trusted extensions
- ⚠️ Check extension permissions (why does X need to read your storage?)
- ✅ CSP headers restrict malicious script injection
- ✅ Use browser's permission model (request storage access)
- ❌ Cannot fully prevent (browser extension API is too permissive)

**Realistic Assessment:** This is user behavior, not a technical crypto issue.

---

### Attack 6: Subpoena Server Data

**Attack:** Law enforcement gets encrypted bookmarks from server.

```
Attacker has: vaultEnvelope (encrypted) + ciphertext (encrypted)
Attacker does NOT have: passphrase
```

**Outcome:**
- Attacker cannot decrypt anything
- E2EE protects against legal coercion

**Mitigation:**
- ✅ E2EE makes data useless to third parties
- ✅ Even server operator cannot comply with "give me the data" order

---

## Implementation Details

### File Structure

```
lib/
├── crypto.ts                  # Core crypto functions
│   ├── generateVaultKey()
│   ├── deriveKeyFromPassphrase()
│   ├── encryptWithAesGcm()
│   ├── decryptWithAesGcm()
│   ├── wrapKey()
│   ├── unwrapKey()
│   └── ...
│
├── vault-crypto.ts           # Vault-specific functions
│   ├── createVaultEnvelope()
│   ├── unwrapVaultKey()
│   └── ...
│
├── types.ts                  # TypeScript interfaces
│   ├── VaultKeyEnvelope
│   ├── RecoveryCodeWrapper (new)
│   └── ...
│
└── storage.ts                # localStorage wrapper
    ├── saveVaultEnvelope()
    ├── loadVaultEnvelope()
    └── ...

hooks/
├── useVaultEnable.ts          # Enable E2EE (create passphrase)
├── useVaultUnlock.ts          # Unlock vault (enter passphrase)
├── useVaultDisable.ts         # Disable E2EE (revert to plaintext)
├── useRecoveryCodeUnlock.ts   # Unlock with recovery code (new)
├── useRecoveryCodeRegenerate.ts # Generate new recovery codes (new)
└── useSyncEngineUnified.ts    # Sync with encryption

app/api/
├── vault/
│   ├── enable/route.ts        # Create vault on server
│   ├── disable/route.ts       # Delete encrypted data
│   ├── envelope/route.ts      # GET/PUT vault envelope (new)
│   └── ...
│
└── sync/
    ├── push/route.ts          # Push encrypted bookmarks
    ├── pull/route.ts          # Pull encrypted bookmarks
    └── ...

components/
└── vault/
    ├── UnlockScreen.tsx       # Enter passphrase
    ├── VaultSetup.tsx         # Create passphrase + show recovery codes
    ├── RecoveryCodeUnlock.tsx  # Unlock with recovery code (new)
    ├── RecoveryCodeRegenerate.tsx # Settings to generate new codes (new)
    └── ...
```

### Data Storage Locations

| Data | Location | Encrypted? | Lifetime |
|------|----------|-----------|----------|
| Vault Envelope | localStorage + Server | No (but wrapped) | Persistent |
| Vault Key | sessionStorage | No | Session (cleared on close) |
| Encrypted Bookmarks | localStorage + Server | Yes | Persistent |
| Passphrase | In-memory only | N/A | Seconds (derivation only) |
| Recovery Codes | Never stored digitally | N/A | User's safe (physical) |

### Compatibility & Browser Support

**Required Web Crypto APIs:**
```javascript
crypto.subtle.generateKey()        // Generate vault key
crypto.subtle.deriveKey()          // PBKDF2 derivation
crypto.subtle.encrypt()            // AES-GCM encryption
crypto.subtle.decrypt()            // AES-GCM decryption
crypto.subtle.wrapKey()            // Key wrapping
crypto.subtle.unwrapKey()          // Key unwrapping
crypto.getRandomValues()           // Random generation
```

**Browser Support:**
- Chrome 60+
- Firefox 57+
- Safari 14.1+
- Edge 79+
- Not available in IE 11 (expected)

**Fallback:** If Web Crypto unavailable, disable E2EE mode, show warning.

---

### Future Enhancements

**1. Passphrase Change Without Re-wrapping**
- Derive new wrapping key from new passphrase
- Re-wrap vault key with new key
- Existing bookmarks remain encrypted with same vault key
- Implementation already designed, just needs UI

**2. WebAuthn Support**
- Add FIDO2/WebAuthn as alternative unlock method
- Wrap vault key with WebAuthn assertion
- Biometric + hardware key unlock
- Same vault key design supports this

**3. Argon2 Key Derivation**
- More memory-hard than PBKDF2
- Better resistance to GPU attacks
- Slower (~200ms) but worth it
- Requires newer browser support

**4. Hierarchical Keys**
- Vault key wraps bookmark-specific keys
- Allows revoking individual bookmark access
- More complex, probably overkill

**5. Threshold Recovery**
- Require 2-of-3 recovery codes to unlock
- Higher security for paranoid users
- Adds complexity

---

## Summary

**E2EE in Bookmark Vault achieves:**

✅ Server cannot read bookmarks
✅ Passphrases protected by PBKDF2 work factor
✅ Bookmarks encrypted with AES-256-GCM (authenticated)
✅ Vault key never transmitted
✅ Session-scoped vault key (cleared on browser close)
✅ Recovery codes enable passphrase recovery
✅ Can add multiple unlock methods (future)

**Key Principles:**
1. **Random vault key** wrapped by multiple methods
2. **Work factor on key derivation** (PBKDF2 100k iterations)
3. **Authenticated encryption** (AES-GCM detects tampering)
4. **Zero-knowledge server** (no decryption capability)
5. **Session-scoped keys** (temporary in-memory storage)
6. **User responsibility** (choose strong passphrases, store recovery codes safely)

---

## References

- [NIST SP 800-132: PBKDF2 Specification](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf)
- [NIST SP 800-38D: GCM Mode Specification](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [Web Crypto API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Signal Protocol Documentation](https://signal.org/docs/)
- [WhatsApp Security Whitepaper](https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf)
