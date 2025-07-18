import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleGenerateCsrfToken } from '@/lib/middlewares/csrfProtection';

/**
 * API endpoint to get a new CSRF token
 * This is called after login to enable CSRF protection for subsequent requests
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  return handleGenerateCsrfToken(request, supabase);
}
