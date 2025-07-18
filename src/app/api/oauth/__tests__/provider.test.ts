import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { GET } from '../[provider]/route';
import { createSupabaseServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/crypto/tokenVault', () => ({
  generateRandomString: vi.fn().mockReturnValue('test-random-string'),
  generateCodeChallenge: vi.fn().mockResolvedValue('test-code-challenge'),
  Provider: undefined,
}));

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

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('process', () => ({
  env: {
    GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_OAUTH_GA4_REDIRECT_URI: 'https://example.com/api/oauth/ga4/callback',
    GOOGLE_OAUTH_YOUTUBE_REDIRECT_URI: 'https://example.com/api/oauth/youtube/callback',
    NODE_ENV: 'test',
  },
}));

describe('OAuth Provider Route', () => {
  let mockRequest: any;
  let mockContext: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ teamId: 'test-team-id' }),
      },
    };

    mockContext = {
      params: Promise.resolve({ provider: 'ga4' }),
    };

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      }),
    };

    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);
  });

  it('should return 400 for invalid provider', async () => {
    mockContext.params = Promise.resolve({ provider: 'invalid' });

    const response = await GET(mockRequest, mockContext);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid provider: invalid' },
      { status: 400 }
    );
  });

  it('should return 400 if teamId is missing', async () => {
    mockRequest.nextUrl.searchParams = new URLSearchParams();

    const response = await GET(mockRequest, mockContext);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Team ID is required' },
      { status: 400 }
    );
  });

  it('should create correct redirect URL for Google Analytics', async () => {
    const response = await GET(mockRequest, mockContext);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectCall = (NextResponse.redirect as any).mock.calls[0][0];
    expect(redirectCall).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(redirectCall).toContain('client_id=test-client-id');
    expect(redirectCall).toContain(
      'scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fanalytics.readonly'
    );
  });

  it('should create correct redirect URL for YouTube', async () => {
    mockContext.params = Promise.resolve({ provider: 'youtube' });

    const response = await GET(mockRequest, mockContext);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectCall = (NextResponse.redirect as any).mock.calls[0][0];
    expect(redirectCall).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(redirectCall).toContain('client_id=test-client-id');
    expect(redirectCall).toContain(
      'scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly'
    );
  });
});
