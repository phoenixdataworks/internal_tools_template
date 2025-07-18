import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Sign out on server side
    await supabase.auth.signOut();

    // Clear auth cookie
    const response = NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL));

    // Clear all cookies
    const cookies = response.headers.get('Set-Cookie')?.split(',') || [];
    cookies.forEach(cookie => {
      const [name] = cookie.split('=');
      if (name) {
        response.cookies.set(name.trim(), '', {
          expires: new Date(0),
          path: '/',
          domain: 'localhost',
        });
      }
    });

    return response;
  } catch (error) {
    console.error('Error in signout route:', error);
    return NextResponse.redirect(
      new URL('/signin?error=signout-failed', process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
