import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GET } from '../[provider]/callback/route';
import { POST } from '../[provider]/refresh/route';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Define a type for our mocked response to make TypeScript happy
interface MockedJsonResponse {
  data: any;
  options?: any;
}

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

vi.mock('@/lib/supabase/vault', () => ({
  upsertSocialToken: vi.fn(),
  getRefreshToken: vi.fn().mockResolvedValue('test-refresh-token'),
}));

global.fetch = vi.fn();

vi.mock('process', () => ({
  env: {
    X_OAUTH_CLIENT_ID: 'test-x-client-id',
    X_OAUTH_CLIENT_SECRET: 'test-x-client-secret',
    X_OAUTH_REDIRECT_URI: 'https://example.com/api/oauth/x/callback',
  },
}));

describe('X OAuth Integration', () => {
  describe('Callback Route', () => {
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
        params: Promise.resolve({ provider: 'x' }),
      };

      mockCookieStore = {
        get: (name: string) => {
          const values: { [key: string]: string } = {
            oauth_state: 'test-state',
            oauth_code_verifier: 'test-code-verifier',
            oauth_team_id: 'test-team-id',
            oauth_provider: 'x',
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

      // Mock successful token exchange
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === 'https://api.twitter.com/2/oauth2/token') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'test-x-access-token',
                refresh_token: 'test-x-refresh-token',
                expires_in: 7200,
                token_type: 'bearer',
                scope: 'tweet.read users.read offline.access',
              }),
          });
        } else if (url.startsWith('https://api.twitter.com/2/users/me')) {
          // Mock user profile response
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  id: 'test-x-user-id',
                  name: 'Test X User',
                  username: 'testxuser',
                  profile_image_url: 'https://example.com/profile.jpg',
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });
    });

    it('should handle successful X OAuth callback', async () => {
      const result = await GET(mockRequest, mockContext);

      // Expect redirect to success page
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'https://example.com/teams/integrations?success=x&action=connected',
        { status: 302 }
      );

      // Expect correct token fetch call
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          body: expect.stringContaining('code=test-code'),
        })
      );

      // Expect user profile fetch
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/api\.twitter\.com\/2\/users\/me/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-x-access-token',
          }),
        })
      );

      // Verify response
      expect(result).toBeDefined();
    });

    it('should handle missing code verifier', async () => {
      const originalGet = mockCookieStore.get;
      mockCookieStore.get = (name: string) => {
        if (name === 'oauth_code_verifier') return { value: undefined };
        return originalGet(name);
      };

      await GET(mockRequest, mockContext);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=PKCE%20code%20verifier%20is%20missing'),
        { status: 302 }
      );
    });

    it('should handle X token fetch failure', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          text: () =>
            Promise.resolve('{"error":"invalid_grant","error_description":"Invalid code"}'),
        })
      );

      await GET(mockRequest, mockContext);

      expect(NextResponse.redirect).toHaveBeenCalledWith(expect.stringContaining('error='), {
        status: 302,
      });
    });
  });

  describe('Refresh Route', () => {
    let mockRequest: any;
    let mockContext: any;
    let mockSupabase: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockRequest = {
        json: vi.fn().mockResolvedValue({ accountId: 'test-account-id' }),
      };

      mockContext = {
        params: Promise.resolve({ provider: 'x' }),
      };

      mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            provider: 'x',
            provider_user_id: 'test-x-user-id',
            team_id: 'test-team-id',
            metadata: { name: 'Test X User' },
          },
          error: null,
        }),
      };
      (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);

      // Mock successful token refresh
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-x-access-token',
              expires_in: 7200,
            }),
        })
      );
    });

    it('should refresh X token successfully', async () => {
      const result = (await POST(mockRequest, mockContext)) as unknown as MockedJsonResponse;
      expect(result).toBeDefined();
      expect(result.data).toEqual({
        success: true,
        provider: 'x',
        expiresAt: expect.any(String),
      });

      // Verify token refresh request
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.twitter.com/2/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=refresh_token'),
        })
      );
    });

    it('should handle token refresh error', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('{"error":"invalid_grant"}'),
        })
      );

      const result = (await POST(mockRequest, mockContext)) as unknown as MockedJsonResponse;
      expect(result.data).toEqual({
        error: expect.stringContaining('X token refresh failed'),
      });
      expect(result.options).toEqual({ status: 500 });
    });
  });
});
