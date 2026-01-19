# T-INT-01: Add Device Management Table and API

**Epic:** Complete E2E Cloud Sync Integration
**Type:** Backend
**State:** pending
**Dependencies:** T-AUTH-05 (Epic 1)

---

## Action

Implement device tracking for multi-device support

---

## Business Summary

Show users which devices have access to their vault

---

## Logic

1. Create `devices` table in database
2. Add device registration on vault enable
3. Create `GET /api/devices` endpoint
4. Update `last_seen` timestamp on sync
5. Add device removal endpoint
6. Generate fingerprint from user agent + IP hash
7. Auto-name devices (e.g., "Chrome on macOS")

---

## Technical Logic

**Device Schema:**
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_fingerprint ON devices(fingerprint);
```

**Fingerprint Generation:**
```typescript
// Combine user agent + IP hash
const fingerprint = hash(`${userAgent}-${ipAddress}`);
```

---

## Migration

```sql
-- lib/db/migrations/003_create_devices.sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
```

---

## API Implementation

```typescript
// app/api/devices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { query } from '@/lib/db';
import { headers } from 'next/headers';

/**
 * GET /api/devices - List all devices
 */
export async function GET() {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const devices = await query(
      'SELECT id, name, last_seen_at, created_at FROM devices WHERE user_id = $1 ORDER BY last_seen_at DESC',
      [userId]
    );

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devices - Register or update device
 */
export async function POST(req: NextRequest) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const ip = headersList.get('x-forwarded-for') || 'unknown';

    // Generate device name from user agent
    const name = generateDeviceName(userAgent);

    // Generate fingerprint
    const fingerprint = generateFingerprint(userAgent, ip);

    // Check if device exists
    const existing = await query(
      'SELECT id FROM devices WHERE user_id = $1 AND fingerprint = $2',
      [userId, fingerprint]
    );

    if (existing.length > 0) {
      // Update last_seen
      await query(
        'UPDATE devices SET last_seen_at = NOW() WHERE id = $1',
        [existing[0].id]
      );

      return NextResponse.json({
        deviceId: existing[0].id,
        name,
        updated: true,
      });
    }

    // Register new device
    const inserted = await query(
      `INSERT INTO devices (user_id, name, fingerprint)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, name, fingerprint]
    );

    return NextResponse.json({
      deviceId: inserted[0].id,
      name,
      updated: false,
    });
  } catch (error) {
    console.error('Failed to register device:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/devices - Remove a device
 */
export async function DELETE(req: NextRequest) {
  const userId = auth().userId;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      );
    }

    await query(
      'DELETE FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove device:', error);
    return NextResponse.json(
      { error: 'Failed to remove device' },
      { status: 500 }
    );
  }
}

function generateDeviceName(userAgent: string): string {
  // Parse user agent
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Mac OS X')) os = 'macOS';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return `${browser} on ${os}`;
}

function generateFingerprint(userAgent: string, ip: string): string {
  // Simple hash - in production, use proper crypto hash
  const str = `${userAgent}-${ip}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fp-${Math.abs(hash)}`;
}
```

---

## Integration with Sync

```typescript
// In sync push endpoint
export async function POST(req: NextRequest) {
  // ... existing sync logic ...

  // Register/update device
  await fetch('/api/devices', { method: 'POST' });

  // ... rest of sync logic ...
}
```

---

## Testing

**Integration Test:**
- Verify device registration
- Verify device listing
- Verify device removal
- Verify last_seen updates

---

## Files

**CREATE:**
- `lib/db/migrations/003_create_devices.sql`
- `app/api/devices/route.ts`

---

## Patterns

- Follow existing API patterns
- Use proper auth checks
- Return consistent error format

---

## Verification Checklist

- [ ] Devices table created
- [ ] GET /api/devices works
- [ ] POST /api/devices registers device
- [ ] DELETE /api/devices removes device
- [ ] Device names generated correctly
- [ ] Fingerprints unique per device
- [ ] last_seen updated on sync
- [ ] Auth enforced on all endpoints
- [ ] Integration tests pass

---

## Notes

- Consider adding device limits (e.g., 5 devices max)
- Consider adding "current device" indicator
- Consider adding device nickname editing
- Fingerprint should be more secure in production
- Consider adding device management UI
- Show last sync time per device
- Consider adding push notifications for new devices
