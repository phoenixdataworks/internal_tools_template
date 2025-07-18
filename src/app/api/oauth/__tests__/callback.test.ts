import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GET } from '../[provider]/callback/route';
import { createSupabaseServerClient } from '@/lib/supabase/server';

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, options) => ({ data, options })),
    redirect: vi.fn(url => ({
      url,
      cookies: {
        set: vi.fn(),
      },
    })),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

global.fetch = vi.fn();

vi.mock('process', () => ({
  env: {
    GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_OAUTH_GA4_REDIRECT_URI: 'https://example.com/api/oauth/ga4/callback',
    GOOGLE_OAUTH_YOUTUBE_REDIRECT_URI: 'https://example.com/api/oauth/youtube/callback',
  },
}));

describe('OAuth Callback Route', () => {
  let mockRequest: any;
  let mockContext: any;
  let mockCookieStore: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          code: 'test-code',
          state: 'test-state',
        }),
        origin: 'https://example.com',
      },
    };

    mockContext = {
      params: Promise.resolve({ provider: 'ga4' }),
    };

    mockCookieStore = {
      get: (name: string) => {
        const values: { [key: string]: string } = {
          oauth_state: 'test-state',
          oauth_code_verifier: 'test-code-verifier',
          oauth_team_id: 'test-team-id',
          oauth_provider: 'ga4',
        };
        return { value: values[name] };
      },
    };
    (cookies as any).mockResolvedValue(mockCookieStore);

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        error: null,
      }),
    };
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      }),
    });
  });

  it('should handle OAuth errors from provider', async () => {
    mockRequest.nextUrl.searchParams = new URLSearchParams({
      error: 'access_denied',
      error_description: 'User declined access',
    });

    await GET(mockRequest, mockContext);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'https://example.com/teams/integrations?error=User%20declined%20access',
      { status: 302 }
    );
  });

  it('should verify state parameter', async () => {
    const originalGet = mockCookieStore.get;
    mockCookieStore.get = (name: string) => {
      if (name === 'oauth_state') return { value: 'different-state' };
      return originalGet(name);
    };

    await GET(mockRequest, mockContext);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=Security%20validation%20failed'),
      { status: 302 }
    );
  });

  it('should use the correct redirect URI for Google Analytics', async () => {
    (global.fetch as any).mockImplementation(
      (url: string, options: { body: string; method: string }) => {
        const body = new URLSearchParams(options.body);
        expect(body.get('redirect_uri')).toBe('https://example.com/api/oauth/ga4/callback');
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_in: 3600,
            }),
        });
      }
    );

    await GET(mockRequest, mockContext);

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should use the correct redirect URI for YouTube', async () => {
    mockContext.params = Promise.resolve({ provider: 'youtube' });
    const originalGet = mockCookieStore.get;
    mockCookieStore.get = (name: string) => {
      if (name === 'oauth_provider') return { value: 'youtube' };
      return originalGet(name);
    };

    (global.fetch as any).mockImplementation(
      (url: string, options: { body: string; method: string }) => {
        const body = new URLSearchParams(options.body);
        expect(body.get('redirect_uri')).toBe('https://example.com/api/oauth/youtube/callback');
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_in: 3600,
            }),
        });
      }
    );

    await GET(mockRequest, mockContext);

    expect(global.fetch).toHaveBeenCalled();
  });
});
