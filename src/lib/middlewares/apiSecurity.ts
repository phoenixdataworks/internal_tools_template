import { NextRequest, NextResponse } from 'next/server';

// Internal API header for HMAC signature verification
export const INTERNAL_HEADER = 'x-internal-signature';

// In-memory store for rate limiting (for development/demo purposes)
// In production, this should be replaced with Redis or another distributed cache
const ipRateLimitStore: Record<string, { count: number; resetAt: number }> = {};

/**
 * Rate limit middleware for protecting endpoints from abuse
 * @param request The incoming request
 * @param maxRequests Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns An error response if rate limit is exceeded, or null if within limits
 */
export function rateLimit(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000
): NextResponse | null {
  // Get client IP address - NextRequest doesn't have direct ip property, use headers
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  // Check if IP exists in store and if window has reset
  if (!ipRateLimitStore[ip] || ipRateLimitStore[ip].resetAt < now) {
    ipRateLimitStore[ip] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return null;
  }

  // Increment request count
  ipRateLimitStore[ip].count++;

  // Check if rate limit exceeded
  if (ipRateLimitStore[ip].count > maxRequests) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);

    // Calculate time remaining until reset
    const resetIn = Math.ceil((ipRateLimitStore[ip].resetAt - now) / 1000);

    return NextResponse.json(
      { error: 'Too many requests, please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(ipRateLimitStore[ip].resetAt / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Check if current user is authorized to access another user's data
 * @param supabase Supabase client
 * @param currentUserId ID of the current authenticated user
 * @param targetUserId ID of the user being accessed
 * @returns Promise resolving to true if authorized, false otherwise
 */
export async function isAuthorizedForUserAccess(
  supabase: any,
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  // If user is accessing their own data, always allow
  if (currentUserId === targetUserId) {
    return true;
  }

  // Otherwise, check if user is an admin/owner in any team that the target user belongs to
  const { data: teamsWithTargetUser } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', targetUserId);

  if (!teamsWithTargetUser || teamsWithTargetUser.length === 0) {
    return false;
  }

  // Get list of team IDs where target user is a member
  const teamIds = teamsWithTargetUser.map((t: any) => t.team_id);

  // Check if current user is admin/owner in any of these teams
  const { data: adminRoles } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', currentUserId)
    .in('team_id', teamIds);

  return !!adminRoles && adminRoles.some((r: any) => r.role === 'admin' || r.role === 'owner');
}

/**
 * Verify HMAC signature for internal API calls using Web Crypto API
 * @param secret The HMAC secret key
 * @param signature The signature to verify
 * @param body The request body
 * @returns Promise resolving to true if signature is valid
 */
export async function verify(secret: string, signature: string, body: string): Promise<boolean> {
  try {
    // Convert secret and body to ArrayBuffer using TextEncoder
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    // Import key for HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate signature
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);

    // Convert ArrayBuffer to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}
