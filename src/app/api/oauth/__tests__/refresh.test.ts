import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { POST } from '../[provider]/refresh/route';
import { createSupabaseServerClient } from '@/lib/supabase/server';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, options) => ({ data, options })),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

global.fetch = vi.fn();

vi.mock('process', () => ({
  env: {
    GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
  },
}));

describe('OAuth Refresh Route', () => {
  let mockRequest: any;
  let mockContext: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      json: vi.fn().mockResolvedValue({
        accountId: 'test-account-id',
      }),
    };

    mockContext = {
      params: Promise.resolve({ provider: 'ga4' }),
    };

    mockSupabase = {
      rpc: vi.fn((functionName, params) => {
        if (functionName === 'get_decrypted_refresh_token') {
          return Promise.resolve({
            data: 'test-refresh-token',
            error: null,
          });
        }
        return Promise.resolve({
          error: null,
        });
      }),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { provider: 'ga4' },
        error: null,
      }),
    };
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'new-access-token',
          expires_in: 3600,
        }),
    });
  });

  it('should return 400 if accountId is missing', async () => {
    mockRequest.json.mockResolvedValue({});

    await POST(mockRequest, mockContext);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Account ID is required' },
      { status: 400 }
    );
  });

  it('should refresh token for Google Analytics', async () => {
    await POST(mockRequest, mockContext);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('refresh_token=test-refresh-token'),
      })
    );

    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      provider: 'ga4',
      expiresAt: expect.any(String),
    });
  });

  it('should refresh token for YouTube', async () => {
    mockSupabase.single.mockResolvedValue({
      data: { provider: 'youtube' },
      error: null,
    });

    await POST(mockRequest, mockContext);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('refresh_token=test-refresh-token'),
      })
    );

    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      provider: 'youtube',
      expiresAt: expect.any(String),
    });
  });

  it('should handle token refresh errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked',
        }),
    });

    await POST(mockRequest, mockContext);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Google token refresh failed'),
      }),
      { status: 500 }
    );
  });
});
