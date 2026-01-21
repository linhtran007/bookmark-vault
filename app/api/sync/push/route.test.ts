import { POST } from './route';

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(async () => ({ userId: 'user_123' })),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

const mockQuery = jest.requireMock('@/lib/db').query as jest.Mock;

describe('POST /api/sync/push', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('enforces encrypted invariants on insert', async () => {
    mockQuery
      // existing select
      .mockResolvedValueOnce([])
      // insert
      .mockResolvedValueOnce([{ id: 1, version: 1 }])
      // sync_settings update
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          {
            recordId: 'r1',
            recordType: 'bookmark',
            ciphertext: 'cipher',
            baseVersion: 0,
            deleted: false,
          },
        ],
      }),
    });

    await POST(req);

    const insertSql = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO records')
    )?.[0];

    expect(insertSql).toContain('data');
    expect(insertSql).toContain('NULL');
  });

  it('auto-converts existing rows to encrypted on update', async () => {
    mockQuery
      // existing select
      .mockResolvedValueOnce([{ id: 123, version: 10, ciphertext: null }])
      // update
      .mockResolvedValueOnce([{ version: 11 }])
      // sync_settings update
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          {
            recordId: 'r1',
            recordType: 'bookmark',
            ciphertext: 'cipher',
            baseVersion: 10,
            deleted: false,
          },
        ],
      }),
    });

    await POST(req);

    const updateSql = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE records')
    )?.[0];

    expect(updateSql).toContain('encrypted = true');
    expect(updateSql).toContain('data = NULL');
  });
});
