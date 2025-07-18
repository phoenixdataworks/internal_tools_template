import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const CSRF_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a secure CSRF token
 * @returns A random CSRF token string
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get a hash of the CSRF token to avoid storing the actual token in the database
 * @param token The CSRF token to hash
 * @returns Hashed token string
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Store a CSRF token for a user
 * @param supabase Supabase client
 * @param userId The user ID to associate with the token
 * @param token The CSRF token to store
 * @returns Promise that resolves when token is stored
 */
export async function storeUserCsrfToken(
  supabase: SupabaseClient,
  userId: string,
  token: string
): Promise<void> {
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + CSRF_TTL_MS);

  try {
    const { error } = await supabase.from('security_tokens').upsert(
      {
        user_id: userId,
        token_type: 'csrf',
        token_hash: hashedToken,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'user_id,token_type',
      }
    );
    if (error) {
      console.error('Error upserting CSRF token:', error);
    } else {
      console.log('CSRF token stored in security_tokens for user', userId);
    }
  } catch (error) {
    console.error('Error storing CSRF token:', error);
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        csrf_token: hashedToken,
        csrf_token_expires_at: expiresAt.toISOString(),
      },
    });
    console.log('CSRF token stored in user_metadata for user', userId);
  }
}

/**
 * Set CSRF token as a cookie
 * @param response NextResponse object to set cookie on
 * @param token CSRF token
 * @returns Updated response with cookie set
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CSRF_TTL_MS / 1000, // Convert to seconds
  });

  return response;
}

/**
 * Middleware to validate CSRF token for state-changing operations
 * @param request The incoming request
 * @param supabase Supabase client
 * @returns NextResponse with error or null if valid
 */
export async function validateCsrfToken(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  // Skip validation for GET and HEAD requests
  if (request.method === 'GET' || request.method === 'HEAD') {
    return null;
  }

  // Get the CSRF token from the header and cookie
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  // Check if both tokens exist
  if (!headerToken || !cookieToken) {
    console.warn('CSRF validation failed: Missing token');
    return NextResponse.json({ error: 'CSRF validation failed. Missing token.' }, { status: 403 });
  }

  // Check if the tokens match
  if (headerToken !== cookieToken) {
    console.warn('CSRF validation failed: Token mismatch');
    return NextResponse.json({ error: 'CSRF validation failed. Invalid token.' }, { status: 403 });
  }

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn('CSRF validation failed: No authenticated user');
    return NextResponse.json(
      { error: 'CSRF validation failed. Authentication required.' },
      { status: 401 }
    );
  }

  // For additional security, verify the token against the stored token
  // This is optional but recommended for sensitive operations
  try {
    const hashedToken = hashToken(headerToken);

    // Try to fetch from security_tokens table first
    const { data: storedToken, error: fetchError } = await supabase
      .from('security_tokens')
      .select('token_hash, expires_at')
      .eq('user_id', user.id)
      .eq('token_type', 'csrf')
      .single();

    if (fetchError || !storedToken) {
      // Fallback to user metadata if table not found
      const { data: userData } = await supabase.auth.admin.getUserById(user.id);

      if (!userData?.user?.user_metadata?.csrf_token) {
        console.warn('CSRF validation failed: No stored token found');
        return NextResponse.json(
          { error: 'CSRF validation failed. Invalid session.' },
          { status: 403 }
        );
      }

      const storedHash = userData.user.user_metadata.csrf_token;
      const expiresAt = userData.user.user_metadata.csrf_token_expires_at;

      if (hashedToken !== storedHash) {
        console.warn('CSRF validation failed: Token hash mismatch in metadata');
        return NextResponse.json(
          { error: 'CSRF validation failed. Invalid token.' },
          { status: 403 }
        );
      }

      if (expiresAt && new Date(expiresAt) < new Date()) {
        console.warn('CSRF validation failed: Token expired in metadata');
        return NextResponse.json(
          { error: 'CSRF validation failed. Token expired.' },
          { status: 403 }
        );
      }
    } else {
      // Validate against the database record
      if (hashedToken !== storedToken.token_hash) {
        console.warn('CSRF validation failed: Token hash mismatch in database');
        return NextResponse.json(
          { error: 'CSRF validation failed. Invalid token.' },
          { status: 403 }
        );
      }

      if (new Date(storedToken.expires_at) < new Date()) {
        console.warn('CSRF validation failed: Token expired in database');
        return NextResponse.json(
          { error: 'CSRF validation failed. Token expired.' },
          { status: 403 }
        );
      }
    }
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return NextResponse.json({ error: 'CSRF validation failed. Server error.' }, { status: 500 });
  }

  // Token is valid
  return null;
}

/**
 * Middleware wrapper for Next.js API routes to enforce CSRF protection
 * @param handler The original API route handler
 * @returns A new handler with CSRF protection
 */
export function withCsrfProtection(
  handler: (req: NextRequest, supabase: SupabaseClient) => Promise<NextResponse>
) {
  return async (request: NextRequest, supabase: SupabaseClient): Promise<NextResponse> => {
    // Skip CSRF validation for non-state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return handler(request, supabase);
    }

    // Validate CSRF token
    const csrfError = await validateCsrfToken(request, supabase);
    if (csrfError) {
      return csrfError;
    }

    // Call the original handler
    return handler(request, supabase);
  };
}

/**
 * API endpoint to generate a new CSRF token
 * Typically called during login or session initialization
 */
export async function handleGenerateCsrfToken(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<NextResponse> {
  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Generate a new CSRF token
  const token = generateCsrfToken();

  // Store the token
  await storeUserCsrfToken(supabase, user.id, token);

  // Return token in response
  const response = NextResponse.json({ token });

  // Set token as cookie
  return setCsrfCookie(response, token);
}
