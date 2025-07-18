import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Creates a server-side Supabase client with Next.js 15 async cookies compatibility
 */
export async function createSupabaseServerClient(
  component: boolean = false
): Promise<SupabaseClient<Database>> {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll().map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        async setAll(cookiesToSet) {
          if (component) return;
          try {
            const resolvedCookies = await cookieStore;
            cookiesToSet.forEach(({ name, value, options }) =>
              resolvedCookies.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a server-side Supabase client with service role privileges
 * IMPORTANT: This client should ONLY be used in server-side contexts for operations
 * that require elevated privileges like inserting monitoring data.
 * Never expose this client to the browser or client-side code.
 */
export async function createSupabaseServiceClient(): Promise<SupabaseClient<Database>> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-supabase-auth-override': 'service_role',
        },
      },
    }
  );
}

export async function createSupabaseServerComponentClient() {
  return createSupabaseServerClient();
}

export function createSupabaseReqResClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
}
